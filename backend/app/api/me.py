from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Shop
from app.core.tokens import current_shop
from app.services import ledger

router = APIRouter(tags=["me"])


@router.delete("/me", status_code=204)
def delete_me(
    shop: Shop = Depends(current_shop),
    db: Session = Depends(get_db),
):
    ledger.delete_shop_data(db, shop.id)
    return None
