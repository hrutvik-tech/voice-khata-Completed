from __future__ import annotations
import re
from typing import Literal
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Shop
from app.core.tokens import current_shop
from app.api.auth import _format_shop

router = APIRouter(prefix="/shop", tags=["shop"])


class UpdateShopRequest(BaseModel):
    shop_name: str = Field(min_length=1, max_length=80)
    open_time: str
    close_time: str
    language_mode: Literal["hi", "kn", "en", "mix"]


def _validate_hh_mm(t: str) -> bool:
    m = re.fullmatch(r"([01]\d|2[0-3]):([0-5]\d)", t)
    return bool(m)


@router.get("")
def get_shop(shop: Shop = Depends(current_shop)):
    return _format_shop(shop)


@router.put("")
def update_shop(
    req: UpdateShopRequest,
    shop: Shop = Depends(current_shop),
    db: Session = Depends(get_db),
):
    if not _validate_hh_mm(req.open_time) or not _validate_hh_mm(req.close_time):
        raise HTTPException(status_code=422, detail="Invalid time format, must be HH:MM")

    if req.open_time == req.close_time:
        raise HTTPException(status_code=422, detail="open_time and close_time cannot be equal")

    shop_db = db.query(Shop).filter(Shop.id == shop.id).first()
    shop_db.shop_name = req.shop_name.strip()
    shop_db.open_time = req.open_time
    shop_db.close_time = req.close_time
    shop_db.language_mode = req.language_mode
    shop_db.setup_complete = True

    db.commit()
    db.refresh(shop_db)
    return _format_shop(shop_db)
