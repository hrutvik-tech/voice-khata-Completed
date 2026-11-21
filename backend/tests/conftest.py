from __future__ import annotations
import os
import tempfile
import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

# Configure environment before importing app
_test_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_test_db.close()
_test_key = Fernet.generate_key().decode()

os.environ["APP_ENV"] = "dev"
os.environ["DEBUG"] = "true"
os.environ["DB_PATH"] = _test_db.name
os.environ["ENCRYPTION_MODE"] = "fernet"
os.environ["DB_KEY"] = _test_key
os.environ["JWT_SECRET"] = "test-jwt-secret-key-for-unit-testing"
os.environ["USE_STUB_SPEECH"] = "true"
os.environ["USE_STUB_AI"] = "false"

from app.core.config import get_settings
get_settings.cache_clear()

from app.main import create_app
from app.db.session import init_db, SessionLocal, engine
from app.db.models import Base
from app.db.seed import seed_demo
from app.core.tokens import create_token


def pytest_configure(config):
    config.addinivalue_line("markers", "live: mark test as requiring live external API credentials")


def pytest_collection_modifyitems(config, items):
    run_live = os.getenv("RUN_LIVE_TESTS", "false").lower() == "true"
    if not run_live:
        skip_live = pytest.mark.skip(reason="Skipping live test because RUN_LIVE_TESTS is false")
        for item in items:
            if "live" in item.keywords:
                item.add_marker(skip_live)


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.fixture
def demo_shop():
    return seed_demo()


@pytest.fixture
def auth_headers(demo_shop):
    token = create_token(demo_shop.id)
    return {"Authorization": f"Bearer {token}"}
