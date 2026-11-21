from __future__ import annotations
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import get_settings
from app.core.crypto import make_engine
from app.db.models import Base

settings = get_settings()
engine = make_engine(settings.DB_PATH)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
