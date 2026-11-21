from __future__ import annotations
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.config import get_settings


def hash_pin(pin: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pin.encode("utf-8"), salt).decode("utf-8")


def verify_pin(pin: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pin.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(shop_id: int) -> str:
    settings = get_settings()
    exp = datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRE_DAYS)
    payload = {
        "shop_id": shop_id,
        "exp": exp,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="unauthorized")


def get_current_shop_id(authorization: str | None = Header(None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="unauthorized")
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_token(token)
    shop_id = payload.get("shop_id")
    if shop_id is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    return int(shop_id)


def current_shop(
    shop_id: int = Depends(get_current_shop_id),
):
    from app.db.session import SessionLocal
    from app.db.models import Shop
    # To ensure changes persist even if modified across sessions, use SessionLocal or query
    # But when a route uses db: Session = Depends(get_db), we can reload or merge into db:
    db = SessionLocal()
    shop = db.query(Shop).filter(Shop.id == shop_id).first()
    if not shop:
        db.close()
        raise HTTPException(status_code=401, detail="unauthorized")
    db.close()
    return shop

