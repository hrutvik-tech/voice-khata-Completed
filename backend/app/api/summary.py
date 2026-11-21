from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Shop
from app.core.tokens import current_shop
from app.services import ledger, providers
from app.services.orchestrator import _get_shop_info

router = APIRouter(prefix="/summary", tags=["summary"])


@router.get("/today")
def get_today_summary(
    shop: Shop = Depends(current_shop),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    shop_info = _get_shop_info(shop)
    b_date = providers.ai().business_date(now, shop_info)
    return ledger.day_summary(db, shop.id, b_date)
