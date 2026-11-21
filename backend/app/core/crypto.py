from __future__ import annotations
import os
from pathlib import Path
from urllib.parse import quote_plus
from sqlalchemy import create_engine, Engine
from app.core.config import get_settings

_fernet_instance = None


def _get_fernet():
    global _fernet_instance
    if _fernet_instance is None:
        settings = get_settings()
        if settings.DB_KEY:
            try:
                from cryptography.fernet import Fernet
                _fernet_instance = Fernet(settings.DB_KEY.encode() if isinstance(settings.DB_KEY, str) else settings.DB_KEY)
            except Exception:
                _fernet_instance = None
    return _fernet_instance


def make_engine(db_path: str) -> Engine:
    settings = get_settings()
    p = Path(db_path).resolve()
    p.parent.mkdir(parents=True, exist_ok=True)

    if settings.ENCRYPTION_MODE == "sqlcipher":
        # Passphrase url-encoded
        passphrase = quote_plus(settings.DB_KEY)
        db_url = f"sqlite+pysqlcipher://:{passphrase}@{p}"
        return create_engine(db_url, connect_args={"check_same_thread": False})
    else:
        db_url = f"sqlite:///{p}"
        return create_engine(db_url, connect_args={"check_same_thread": False})


def encrypt_text(value: str | None) -> str | None:
    if value is None:
        return None
    settings = get_settings()
    if settings.ENCRYPTION_MODE != "fernet":
        return value
    f = _get_fernet()
    if f is None:
        return value
    return f.encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_text(value: str | None) -> str | None:
    if value is None:
        return None
    settings = get_settings()
    if settings.ENCRYPTION_MODE != "fernet":
        return value
    f = _get_fernet()
    if f is None:
        return value
    try:
        return f.decrypt(value.encode("utf-8")).decode("utf-8")
    except Exception:
        # If decryption fails (e.g. plain text or corrupted), return as-is
        return value
