from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    CheckConstraint,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def utcnow():
    return datetime.now(timezone.utc)


class Shop(Base):
    __tablename__ = "shops"

    id = Column(Integer, primary_key=True, autoincrement=True)
    owner_name = Column(String(60), nullable=False)
    shop_name = Column(String(80), nullable=False, default="")
    phone = Column(String(10), unique=True, nullable=False)
    pin_hash = Column(String(128), nullable=False)
    open_time = Column(String(5), nullable=False, default="06:00")
    close_time = Column(String(5), nullable=False, default="02:00")
    timezone = Column(String(50), nullable=False, default="Asia/Kolkata")
    language_mode = Column(String(10), nullable=False, default="mix")
    setup_complete = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    customers = relationship("Customer", back_populates="shop", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="shop", cascade="all, delete-orphan")
    sessions = relationship("ConversationSession", back_populates="shop", cascade="all, delete-orphan")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    shop_id = Column(Integer, ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    name_key = Column(String(100), nullable=False)
    phone = Column(Text, nullable=True)  # encrypted text
    area = Column(String(100), nullable=True)
    source = Column(String(20), nullable=False, default="manual")  # "voice" or "manual"
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    shop = relationship("Shop", back_populates="customers")
    transactions = relationship("Transaction", back_populates="customer", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount_paise > 0", name="check_positive_amount"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    shop_id = Column(Integer, ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    amount_paise = Column(Integer, nullable=False)
    direction = Column(String(10), nullable=False)  # "credit" or "payment"
    business_date = Column(Date, nullable=False)
    recorded_at = Column(DateTime(timezone=True), nullable=False)  # stored as UTC
    status = Column(String(10), nullable=False, default="active")  # "active" or "undone"
    source = Column(String(20), nullable=False, default="voice")  # "voice", "offline" or "seed"
    language = Column(String(10), nullable=True)
    raw_transcript = Column(Text, nullable=True)  # encrypted text
    session_id = Column(String(64), nullable=True)
    idempotency_key = Column(String(128), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    shop = relationship("Shop", back_populates="transactions")
    customer = relationship("Customer", back_populates="transactions")
    corrections = relationship("CorrectionHistory", back_populates="transaction", cascade="all, delete-orphan")


class CorrectionHistory(Base):
    __tablename__ = "correction_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(10), nullable=False)  # "amend" or "undo"
    old_amount_paise = Column(Integer, nullable=False)
    new_amount_paise = Column(Integer, nullable=True)
    session_id = Column(String(64), nullable=True)
    at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    transaction = relationship("Transaction", back_populates="corrections")


class ConversationSession(Base):
    __tablename__ = "conversation_sessions"

    id = Column(String(64), primary_key=True)  # uuid string
    shop_id = Column(Integer, ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)
    state = Column(String(20), nullable=False, default="resting")
    last_txn_id = Column(Integer, nullable=True)
    last_txn_at = Column(DateTime(timezone=True), nullable=True)
    pending_json = Column(Text, nullable=True)
    disclosed = Column(Boolean, nullable=False, default=False)
    last_language = Column(String(10), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    shop = relationship("Shop", back_populates="sessions")
