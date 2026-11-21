from __future__ import annotations
import pytest


def test_auth_and_shop_flow(client):
    # 1. Register new shop
    reg_payload = {
        "owner_name": "Raju Bhai",
        "phone": "9812345678",
        "pin": "5678",
    }
    res = client.post("/auth/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert "token" in data
    assert data["shop"]["owner_name"] == "Raju Bhai"
    assert data["shop"]["setup_complete"] is False
    token = data["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Duplicate phone returns 409
    res_dup = client.post("/auth/register", json=reg_payload)
    assert res_dup.status_code == 409
    assert res_dup.json()["detail"] == "phone_exists"

    # 2. Login
    res_login = client.post("/auth/login", json={"phone": "9812345678", "pin": "5678"})
    assert res_login.status_code == 200
    assert "token" in res_login.json()

    # Wrong PIN
    res_bad_pin = client.post("/auth/login", json={"phone": "9812345678", "pin": "0000"})
    assert res_bad_pin.status_code == 401
    assert res_bad_pin.json()["detail"] == "wrong_pin"

    # 3. Change PIN
    res_pin = client.put("/auth/pin", headers=headers, json={"old_pin": "5678", "new_pin": "9999"})
    assert res_pin.status_code == 204

    # Verify old PIN no longer works
    res_old = client.post("/auth/login", json={"phone": "9812345678", "pin": "5678"})
    assert res_old.status_code == 401
    # Verify new PIN works
    res_new = client.post("/auth/login", json={"phone": "9812345678", "pin": "9999"})
    assert res_new.status_code == 200

    # 4. Get & Update Shop
    res_shop = client.get("/shop", headers=headers)
    assert res_shop.status_code == 200
    assert res_shop.json()["owner_name"] == "Raju Bhai"

    # Update shop
    update_payload = {
        "shop_name": "Raju Super Mart",
        "open_time": "07:00",
        "close_time": "23:00",
        "language_mode": "hi",
    }
    res_up = client.put("/shop", headers=headers, json=update_payload)
    assert res_up.status_code == 200
    shop_data = res_up.json()
    assert shop_data["shop_name"] == "Raju Super Mart"
    assert shop_data["setup_complete"] is True

    # Invalid times equal -> 422
    res_invalid = client.put("/shop", headers=headers, json={
        "shop_name": "Raju Super Mart",
        "open_time": "07:00",
        "close_time": "07:00",
        "language_mode": "hi",
    })
    assert res_invalid.status_code == 422
