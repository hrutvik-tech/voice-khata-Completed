from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: Literal["dev", "prod"] = "dev"
    DEBUG: bool = True
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    DB_PATH: str = "./data/khata.db"
    ENCRYPTION_MODE: Literal["fernet", "sqlcipher"] = "fernet"
    DB_KEY: str = ""
    JWT_SECRET: str = "default-insecure-jwt-secret-key-change-in-prod"
    JWT_EXPIRE_DAYS: int = 30
    USE_STUB_SPEECH: bool = True
    USE_STUB_AI: bool = False
    STUB_TRANSCRIPT: str = "Ramesh Sharma ka 340 udhaar"
    GNANI_API_KEY: str = ""
    STT_MODEL: str = "prisma-v3.0"
    STT_FORMAT: str = "codemix"
    STT_MIN_SILENCE_MS: int = 350
    STT_VAD_THRESHOLD: float = 0.7
    TTS_MODEL: str = "timbre-v3.0"
    TTS_VOICE: str = ""
    TTS_CONTAINER: str = "mp3"
    LLM_PROVIDER: Literal["gemini", "evon"] = "gemini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = ""
    EVON_API_KEY: str = ""
    TRANSCRIPT_RETENTION_HOURS: int = 48
    RUN_LIVE_TESTS: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
