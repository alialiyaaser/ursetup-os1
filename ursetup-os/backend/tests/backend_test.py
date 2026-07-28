"""UR SETUP backend API tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://9a15242b-6676-4f2b-ac43-9376da112a14.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---- health ----
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert "service" in data and "status" in data
    assert data["status"] == "ok"


# ---- reviews ----
def test_reviews_list_seeded(s):
    r = s.get(f"{API}/reviews")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 6
    assert all("id" in x and "rating" in x for x in data)


def test_reviews_filter_by_product(s):
    r = s.get(f"{API}/reviews", params={"product": "grey-marble"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert all(x["product"] == "grey-marble" for x in data)


def test_reviews_summary(s):
    r = s.get(f"{API}/reviews/summary")
    assert r.status_code == 200
    data = r.json()
    assert "count" in data and "average" in data and "breakdown" in data
    for k in ["5", "4", "3", "2", "1"]:
        assert k in data["breakdown"]


def test_reviews_create_success(s):
    payload = {
        "name": "TEST_User",
        "country": "SA",
        "product": "grey-marble",
        "rating": 5,
        "title": "TEST title",
        "comment": "TEST_ great pad amazing quality",
        "language": "en",
    }
    r = s.post(f"{API}/reviews", json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    assert "id" in data
    assert data["verified"] is False
    assert "created_at" in data
    assert data["rating"] == 5
    # verify persisted via list
    r2 = s.get(f"{API}/reviews", params={"product": "grey-marble"})
    assert any(rv["id"] == data["id"] for rv in r2.json())


def test_reviews_create_rating_out_of_range(s):
    payload = {"name": "X", "product": "grey-marble", "rating": 7, "comment": "bad rating"}
    r = s.post(f"{API}/reviews", json=payload)
    assert r.status_code == 422


def test_reviews_create_empty_comment(s):
    payload = {"name": "X", "product": "grey-marble", "rating": 5, "comment": ""}
    r = s.post(f"{API}/reviews", json=payload)
    assert r.status_code == 422


# ---- newsletter ----
def test_newsletter_subscribe_and_idempotent(s):
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r1 = s.post(f"{API}/newsletter", json={"email": email})
    assert r1.status_code in (200, 201), r1.text
    d1 = r1.json()
    assert d1["email"] == email
    # duplicate
    r2 = s.post(f"{API}/newsletter", json={"email": email})
    assert r2.status_code in (200, 201)
    d2 = r2.json()
    assert d2["email"] == email
    assert d1["id"] == d2["id"] or d1["email"] == d2["email"]


def test_newsletter_invalid_email(s):
    r = s.post(f"{API}/newsletter", json={"email": "not-an-email"})
    assert r.status_code == 422


# ---- stats ----
def test_stats(s):
    r = s.get(f"{API}/stats")
    assert r.status_code == 200
    data = r.json()
    for k in ["customers", "orders", "reviews_count", "average_rating"]:
        assert k in data


# ---- contact ----
def test_contact_success(s):
    r = s.post(f"{API}/contact", json={"name": "TEST_Name", "email": "t@t.com", "message": "hi"})
    assert r.status_code == 200
    data = r.json()
    assert data.get("ok") is True
    assert "id" in data


def test_contact_missing_fields(s):
    r = s.post(f"{API}/contact", json={"name": "only name"})
    assert r.status_code == 400
