"""Auth & Admin API tests for UR SETUP backend."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

SUPER_EMAIL = "admin@ursetup.sa"
SUPER_PASS = "URSetup@2026!"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def super_token(s):
    r = s.post(f"{API}/auth/login", json={"email": SUPER_EMAIL, "password": SUPER_PASS})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def super_headers(super_token):
    return {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}


# ---------------- Auth ----------------
def test_login_success(s):
    r = s.post(f"{API}/auth/login", json={"email": SUPER_EMAIL, "password": SUPER_PASS})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data and data["token_type"] == "bearer"
    assert data["user"]["role"] == "super_admin"
    assert data["user"]["email"] == SUPER_EMAIL


def test_login_wrong_password(s):
    r = s.post(f"{API}/auth/login", json={"email": SUPER_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_me_requires_auth(s):
    r = s.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_me_invalid_token(s):
    r = s.get(f"{API}/auth/me", headers={"Authorization": "Bearer bogus.token.value"})
    assert r.status_code == 401


def test_me_success(s, super_headers):
    r = s.get(f"{API}/auth/me", headers=super_headers)
    assert r.status_code == 200
    d = r.json()
    assert d["email"] == SUPER_EMAIL
    assert d["role"] == "super_admin"


def test_change_password_wrong_current(s, super_headers):
    r = s.post(f"{API}/auth/change-password", headers=super_headers,
               json={"current_password": "wrong-current", "new_password": "SomeNewPass1!"})
    assert r.status_code == 400


# ---------------- Admin: create users, RBAC ----------------
@pytest.fixture(scope="module")
def created_users(s, super_headers):
    """Create an admin and moderator user for RBAC checks."""
    unique = uuid.uuid4().hex[:6]
    admin_email = f"TEST_admin_{unique}@ursetup.sa"
    mod_email = f"TEST_mod_{unique}@ursetup.sa"
    pw = "TestPass123!"

    r1 = s.post(f"{API}/admin/users", headers=super_headers,
                json={"email": admin_email, "password": pw, "name": "TEST Admin", "role": "admin"})
    assert r1.status_code == 201, r1.text
    admin_user = r1.json()

    r2 = s.post(f"{API}/admin/users", headers=super_headers,
                json={"email": mod_email, "password": pw, "name": "TEST Mod", "role": "moderator"})
    assert r2.status_code == 201, r2.text
    mod_user = r2.json()

    # Get tokens
    ra = s.post(f"{API}/auth/login", json={"email": admin_email, "password": pw})
    rm = s.post(f"{API}/auth/login", json={"email": mod_email, "password": pw})
    admin_token = ra.json()["access_token"]
    mod_token = rm.json()["access_token"]

    yield {
        "admin": {"user": admin_user, "token": admin_token, "email": admin_email, "password": pw},
        "mod": {"user": mod_user, "token": mod_token, "email": mod_email, "password": pw},
    }

    # cleanup
    s.delete(f"{API}/admin/users/{admin_user['id']}", headers=super_headers)
    s.delete(f"{API}/admin/users/{mod_user['id']}", headers=super_headers)


def _hdrs(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def test_create_user_duplicate_email(s, super_headers, created_users):
    email = created_users["admin"]["email"]
    r = s.post(f"{API}/admin/users", headers=super_headers,
               json={"email": email, "password": "AnotherPass1!", "name": "dup", "role": "moderator"})
    assert r.status_code == 400


def test_delete_self_forbidden(s, super_headers):
    me = s.get(f"{API}/auth/me", headers=super_headers).json()
    r = s.delete(f"{API}/admin/users/{me['id']}", headers=super_headers)
    assert r.status_code == 400


def test_users_endpoint_requires_super_admin(s, created_users):
    # admin role forbidden
    r = s.get(f"{API}/admin/users", headers=_hdrs(created_users["admin"]["token"]))
    assert r.status_code == 403
    # moderator forbidden
    r = s.get(f"{API}/admin/users", headers=_hdrs(created_users["mod"]["token"]))
    assert r.status_code == 403


def test_update_user_role_and_password(s, super_headers, created_users):
    uid = created_users["mod"]["user"]["id"]
    # update role
    r = s.patch(f"{API}/admin/users/{uid}", headers=super_headers, json={"role": "admin"})
    assert r.status_code == 200
    # verify persisted
    lst = s.get(f"{API}/admin/users", headers=super_headers).json()
    assert any(u["id"] == uid and u["role"] == "admin" for u in lst)
    # invalid role
    r = s.patch(f"{API}/admin/users/{uid}", headers=super_headers, json={"role": "hacker"})
    assert r.status_code == 400
    # password too short
    r = s.patch(f"{API}/admin/users/{uid}", headers=super_headers, json={"password": "x"})
    assert r.status_code == 400
    # revert role back to moderator
    s.patch(f"{API}/admin/users/{uid}", headers=super_headers, json={"role": "moderator"})


# ---------------- Overview ----------------
def test_overview_requires_auth(s):
    r = s.get(f"{API}/admin/overview")
    assert r.status_code == 401


def test_overview_keys(s, super_headers):
    r = s.get(f"{API}/admin/overview", headers=super_headers)
    assert r.status_code == 200
    d = r.json()
    for k in ["users", "reviews", "pending_reviews", "hidden_reviews", "newsletter", "contacts", "coming_soon"]:
        assert k in d


# ---------------- Reviews moderation & RBAC ----------------
def test_admin_reviews_includes_hidden(s, super_headers):
    # create a review then hide it
    r = s.post(f"{API}/reviews", json={
        "name": "TEST_HiddenUser", "product": "grey-marble", "rating": 4,
        "comment": "TEST hidden review", "language": "en",
    })
    rid = r.json()["id"]
    # hide via admin
    p = s.patch(f"{API}/admin/reviews/{rid}", headers=super_headers, json={"hidden": True})
    assert p.status_code == 200
    # public list should exclude
    pub = s.get(f"{API}/reviews").json()
    assert not any(x["id"] == rid for x in pub)
    # admin list includes
    ad = s.get(f"{API}/admin/reviews", headers=super_headers).json()
    assert any(x["id"] == rid for x in ad)
    # cleanup
    s.delete(f"{API}/admin/reviews/{rid}", headers=super_headers)


def test_moderator_cannot_delete_review(s, super_headers, created_users):
    # create a review to delete
    r = s.post(f"{API}/reviews", json={
        "name": "TEST_delperm", "product": "grey-marble", "rating": 5, "comment": "TEST"
    })
    rid = r.json()["id"]
    # moderator forbidden
    r = s.delete(f"{API}/admin/reviews/{rid}", headers=_hdrs(created_users["mod"]["token"]))
    assert r.status_code == 403
    # moderator can PATCH
    r = s.patch(f"{API}/admin/reviews/{rid}", headers=_hdrs(created_users["mod"]["token"]),
                json={"verified": True})
    assert r.status_code == 200
    # cleanup as super_admin
    s.delete(f"{API}/admin/reviews/{rid}", headers=super_headers)


# ---------------- Coming Soon ----------------
def test_coming_soon_crud(s, super_headers):
    from datetime import datetime, timezone, timedelta
    launch = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
    payload = {
        "name_en": "TEST_Drop", "name_ar": "TEST_قطرة",
        "desc_en": "test desc", "desc_ar": "وصف",
        "image": "https://example.com/img.jpg",
        "launch_at": launch, "active": True,
    }
    r = s.post(f"{API}/admin/coming-soon", headers=super_headers, json=payload)
    assert r.status_code == 201, r.text
    cid = r.json()["id"]
    # public list includes it (active)
    pub = s.get(f"{API}/coming-soon").json()
    assert any(x["id"] == cid for x in pub)
    # patch to inactive
    r = s.patch(f"{API}/admin/coming-soon/{cid}", headers=super_headers, json={"active": False})
    assert r.status_code == 200
    pub2 = s.get(f"{API}/coming-soon").json()
    assert not any(x["id"] == cid for x in pub2)
    # delete
    r = s.delete(f"{API}/admin/coming-soon/{cid}", headers=super_headers)
    assert r.status_code == 200


# ---------------- Promo banner ----------------
def test_promo_banner_get_and_put(s, super_headers):
    # get current
    r = s.get(f"{API}/admin/promo-banner", headers=super_headers)
    assert r.status_code == 200
    original = r.json()
    # put new
    new_payload = {"text_en": "TEST EN", "text_ar": "TEST AR", "link": "#", "active": True}
    r = s.put(f"{API}/admin/promo-banner", headers=super_headers, json=new_payload)
    assert r.status_code == 200
    # verify via public
    pub = s.get(f"{API}/promo-banner").json()
    assert pub["text_en"] == "TEST EN"
    assert pub["text_ar"] == "TEST AR"
    # restore
    s.put(f"{API}/admin/promo-banner", headers=super_headers,
          json={"text_en": original.get("text_en", ""), "text_ar": original.get("text_ar", ""),
                "link": original.get("link"), "active": original.get("active", True)})


# ---------------- Newsletter admin ----------------
def test_newsletter_admin_list(s, super_headers):
    # ensure one exists
    s.post(f"{API}/newsletter", json={"email": f"test_{uuid.uuid4().hex[:6]}@example.com"})
    r = s.get(f"{API}/admin/newsletter", headers=super_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------------- Public promo & idempotent seed ----------------
def test_public_promo_banner(s):
    r = s.get(f"{API}/promo-banner")
    assert r.status_code == 200
    d = r.json()
    for k in ["text_en", "text_ar", "active"]:
        assert k in d


def test_super_admin_seed_idempotent(s, super_headers):
    lst = s.get(f"{API}/admin/users", headers=super_headers).json()
    supers = [u for u in lst if u["email"] == SUPER_EMAIL]
    assert len(supers) == 1
