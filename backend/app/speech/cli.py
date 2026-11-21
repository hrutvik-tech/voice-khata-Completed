from __future__ import annotations
import argparse
import asyncio
import json
from pathlib import Path
import time
from app.schemas.contracts import Lang
from app.services import providers


async def run_stt_cli(folder: str, min_silence_ms: int | None = None, vad_threshold: float | None = None):
    p = Path(folder)
    expected_file = p / "expected.json"
    expected_data = {}
    if expected_file.exists():
        with open(expected_file, "r", encoding="utf-8") as f:
            for item in json.load(f):
                expected_data[item["file"]] = item

    wav_files = sorted(list(p.glob("*.wav")))
    if not wav_files:
        print(f"No WAV files found in {folder}")
        return

    print(f"{'File':<15} | {'Expected Text':<30} | {'Transcript':<30} | {'Lang':<5} | {'Latency':<8}")
    print("-" * 100)

    ai_mod = providers.ai()
    speech_mod = providers.speech()
    correct_amounts = 0
    total_evaluated = 0

    for wf in wav_files:
        filename = wf.name
        exp = expected_data.get(filename, {})
        exp_text = exp.get("text", "")
        exp_amount = exp.get("amount_paise")

        with open(wf, "rb") as f:
            audio_bytes = f.read()

        # Skip WAV header (44 bytes standard)
        pcm_bytes = audio_bytes[44:] if audio_bytes.startswith(b"RIFF") else audio_bytes

        lang_hints = ["hi-IN", "kn-IN", "en-IN"]
        session = speech_mod.SttSession(lang_hints=lang_hints, keyterms=[])
        await session.open()

        # Stream 1,024 byte frames every 32 ms
        for offset in range(0, len(pcm_bytes), 1024):
            frame = pcm_bytes[offset:offset+1024]
            if len(frame) < 1024:
                frame = frame.ljust(1024, b"\x00")
            await session.send(frame)
            await asyncio.sleep(0.001)  # Real-time simulation

        await session.commit()
        transcript = await session.result()
        await session.close()

        lang_str = transcript.language or "--"
        lat_str = f"{transcript.latency_ms or 0}ms"
        print(f"{filename:<15} | {exp_text[:28]:<30} | {transcript.text[:28]:<30} | {lang_str:<5} | {lat_str:<8}")

        if exp_amount is not None:
            total_evaluated += 1
            parsed_amt = ai_mod.parse_amount(transcript.text)
            if parsed_amt == exp_amount:
                correct_amounts += 1

    if total_evaluated > 0:
        print(f"\namounts correct: {correct_amounts}/{total_evaluated}")


async def run_tts_cli(text: str, lang: str, out_file: str):
    speech_mod = providers.speech()
    chunks = []
    async for chunk in speech_mod.synthesize(text, lang):
        chunks.append(chunk)

    with open(out_file, "wb") as f:
        for chunk in chunks:
            f.write(chunk)
    print(f"Saved synthesized audio to {out_file}")


def main():
    parser = argparse.ArgumentParser(description="Bolta Khata Speech CLI")
    subparsers = parser.add_subparsers(dest="command")

    stt_p = subparsers.add_parser("stt")
    stt_p.add_argument("folder", help="Folder containing WAV files")
    stt_p.add_argument("--min-silence-ms", type=int, default=None)
    stt_p.add_argument("--vad-threshold", type=float, default=None)

    tts_p = subparsers.add_parser("tts")
    tts_p.add_argument("text", help="Text to speak")
    tts_p.add_argument("language", choices=["hi", "kn", "en"])
    tts_p.add_argument("out_file", help="Output audio file path")

    args = parser.parse_args()
    if args.command == "stt":
        asyncio.run(run_stt_cli(args.folder, args.min_silence_ms, args.vad_threshold))
    elif args.command == "tts":
        asyncio.run(run_tts_cli(args.text, args.language, args.out_file))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
