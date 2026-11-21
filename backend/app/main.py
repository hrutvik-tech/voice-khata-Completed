from __future__ import annotations
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.retention import retention_loop
from app.db.session import init_db, SessionLocal
from app.db.models import Customer
from app.services import providers
from app.api import auth, shop, customers, summary, sync, me, ws, debug


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()

    # Recompute customers.name_key with providers.ai().normalize_name
    db = SessionLocal()
    try:
        norm_fn = providers.ai().normalize_name
        custs = db.query(Customer).all()
        for c in custs:
            c.name_key = norm_fn(c.name)
        db.commit()
    finally:
        db.close()

    # Start retention_loop as background task
    retention_task = asyncio.create_task(retention_loop())

    yield

    # Shutdown
    retention_task.cancel()
    try:
        await retention_task
    except asyncio.CancelledError:
        pass


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Bolta Khata",
        description="Mobile-first voice ledger website for kirana shops",
        version="1.0.0",
        lifespan=lifespan,
    )

    origins = [settings.FRONTEND_ORIGIN]
    if settings.DEBUG:
        origins.extend(["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"])

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():
        return {"ok": True}

    # Register routers
    app.include_router(auth.router)
    app.include_router(shop.router)
    app.include_router(customers.router)
    app.include_router(summary.router)
    app.include_router(sync.router)
    app.include_router(me.router)
    app.include_router(ws.router)

    if settings.DEBUG:
        app.include_router(debug.router)

    return app


app = create_app()
