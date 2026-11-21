from __future__ import annotations
import re
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Shop
from app.core.tokens import hash_pin, verify_pin, create_token, current_shop

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    owner_name: str = Field(min_length=1, max_length=60)
    phone: str
    pin: str


class LoginRequest(BaseModel):
    phone: str
    pin: str


class ChangePinRequest(BaseModel):
    old_pin: str
    new_pin: str


def _format_shop(shop: Shop) -> dict:
    return {
        "id": shop.id,
        "owner_name": shop.owner_name,
        "shop_name": shop.shop_name,
        "phone": shop.phone,
        "open_time": shop.open_time,
        "close_time": shop.close_time,
        "timezone": shop.timezone,
        "language_mode": shop.language_mode,
        "setup_complete": shop.setup_complete,
    }


@router.post("/register", status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    phone = req.phone.strip()
    if not re.fullmatch(r"\d{10}", phone):
        raise HTTPException(status_code=422, detail="Phone must be exactly 10 digits")
    pin = req.pin.strip()
    if not re.fullmatch(r"\d{4,6}", pin):
        raise HTTPException(status_code=422, detail="PIN must be 4-6 digits")

    existing = db.query(Shop).filter(Shop.phone == phone).first()
    if existing:
        raise HTTPException(status_code=409, detail="phone_exists")

    shop = Shop(
        owner_name=req.owner_name.strip(),
        shop_name="",
        phone=phone,
        pin_hash=hash_pin(pin),
        open_time="06:00",
        close_time="02:00",
        timezone="Asia/Kolkata",
        language_mode="mix",
        setup_complete=False,
    )
    db.add(shop)
    db.commit()
    db.refresh(shop)

    token = create_token(shop.id)
    return {"token": token, "shop": _format_shop(shop)}


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    phone = req.phone.strip()
    shop = db.query(Shop).filter(Shop.phone == phone).first()
    if not shop:
        raise HTTPException(status_code=401, detail="wrong_pin")

    if not verify_pin(req.pin.strip(), shop.pin_hash):
        raise HTTPException(status_code=401, detail="wrong_pin")

    token = create_token(shop.id)
    return {"token": token, "shop": _format_shop(shop)}


@router.put("/pin", status_code=204)
def change_pin(
    req: ChangePinRequest,
    shop: Shop = Depends(current_shop),
    db: Session = Depends(get_db)
):
    if not verify_pin(req.old_pin.strip(), shop.pin_hash):
        raise HTTPException(status_code=401, detail="wrong_pin")

    new_pin = req.new_pin.strip()
    if not re.fullmatch(r"\d{4,6}", new_pin):
        raise HTTPException(status_code=422, detail="PIN must be 4-6 digits")

    shop_db = db.query(Shop).filter(Shop.id == shop.id).first()
    shop_db.pin_hash = hash_pin(new_pin)
    db.commit()
    return None
