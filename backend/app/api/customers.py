from __future__ import annotations
import re
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.session import get_db
from app.db.models import Shop, Customer, Transaction, CorrectionHistory
from app.core.tokens import current_shop
from app.core.crypto import decrypt_text
from app.services import ledger, providers

router = APIRouter(prefix="/customers", tags=["customers"])


class CreateCustomerRequest(BaseModel):
    name: str = Field(min_length=1)
    phone: str | None = None
    area: str | None = None
    confirm: bool = False


@router.get("")
def get_customers(
    search: str | None = Query(None),
    shop: Shop = Depends(current_shop),
    db: Session = Depends(get_db),
):
    return ledger.list_customers(db, shop.id, search)


@router.post("", status_code=201)
def create_customer_route(
    req: CreateCustomerRequest,
    shop: Shop = Depends(current_shop),
    db: Session = Depends(get_db),
):
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name cannot be empty")

    now = datetime.now(timezone.utc)
    c_refs = ledger.customer_refs(db, shop.id, now)

    if not req.confirm:
        candidates = providers.ai().match_customers(name, c_refs)
        if candidates:
            similar_list = [
                {"id": c.customer_id, "name": c.name, "area": c.area}
                for c in candidates
            ]
            return JSONResponse(
                status_code=409,
                content={"detail": "similar_exists", "similar": similar_list}
            )

    cust = ledger.create_customer(
        db=db,
        shop_id=shop.id,
        name=name,
        phone=req.phone,
        area=req.area,
        source="manual",
    )
    return {
        "customer": {
            "id": cust.id,
            "name": cust.name,
            "phone": decrypt_text(cust.phone),
            "area": cust.area,
            "source": cust.source,
            "created_at": cust.created_at.isoformat(),
        }
    }


@router.get("/{customer_id}")
def get_customer_detail(
    customer_id: int,
    shop: Shop = Depends(current_shop),
    db: Session = Depends(get_db),
):
    cust = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.shop_id == shop.id,
    ).first()
    if not cust:
        raise HTTPException(status_code=404, detail="customer_not_found")

    bal = ledger.customer_balance(db, cust.id)

    # Entries newest first, undone included
    txns = db.query(Transaction).filter(
        Transaction.customer_id == cust.id
    ).order_by(desc(Transaction.recorded_at)).all()

    entries_data = []
    kolkata_tz = timezone(timedelta(hours=5, minutes=30))

    for t in txns:
        # History
        hist_rows = db.query(CorrectionHistory).filter(
            CorrectionHistory.transaction_id == t.id
        ).order_by(CorrectionHistory.at.asc()).all()

        history_data = [
            {
                "action": h.action,
                "old_amount_paise": h.old_amount_paise,
                "new_amount_paise": h.new_amount_paise,
                "at": h.at.astimezone(kolkata_tz).isoformat() if h.at else None,
            }
            for h in hist_rows
        ]

        rec_str = t.recorded_at.astimezone(kolkata_tz).isoformat() if t.recorded_at else ""

        entries_data.append({
            "id": t.id,
            "customer_id": t.customer_id,
            "customer_name": cust.name,
            "amount_paise": t.amount_paise,
            "direction": t.direction,
            "business_date": t.business_date.isoformat(),
            "recorded_at": rec_str,
            "status": t.status,
            "source": t.source,
            "language": t.language,
            "raw_transcript": decrypt_text(t.raw_transcript),
            "history": history_data,
        })

    return {
        "customer": {
            "id": cust.id,
            "name": cust.name,
            "phone": decrypt_text(cust.phone),
            "area": cust.area,
            "source": cust.source,
            "created_at": cust.created_at.isoformat(),
        },
        "balance_paise": bal,
        "entries": entries_data,
    }
