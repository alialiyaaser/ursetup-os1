"""Iter3: Positions CRUD (careers) + Custom Roles CRUD + non-admin 403."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"
CEO_EMAIL = "teameagls0@gmail.com"
CEO_PASSWORD = "URSetup@2026!"


def _token(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, r.text
    j = r.json()
    return j.get("access_token") or j.get("token")


@pytest.fixture(scope="module")
def ceo_headers():
    return {"Authorization": f"Bearer {_token(CEO_EMAIL, CEO_PASSWORD)}"}


@pytest.fixture(scope="module")
def employee_headers(ceo_headers):
    """Create a fresh non-admin employee (role='Employee') and return their headers."""
    email = f"test_emp_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "TestPass123!"
    payload = {"email": email, "name": "TEST Employee", "role": "Employee",
               "password": pwd, "language": "en", "permissions": []}
    r = requests.post(f"{API}/os/employees", headers=ceo_headers, json=payload, timeout=15)
    assert r.status_code in (200, 201), r.text
    tok = _token(email, pwd)
    return {"Authorization": f"Bearer {tok}"}


# ---------- Positions ----------
class TestPositions:
    def test_create_position_ceo(self, ceo_headers):
        body = {"title": "TEST Video Editor", "department": "Media",
                "description": "Edit videos", "requirements": "Premiere Pro", "is_open": True}
        r = requests.post(f"{API}/os/hr/positions", headers=ceo_headers, json=body, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == body["title"]
        assert d["is_open"] is True
        assert "id" in d
        assert "_id" not in d
        pytest.position_id = d["id"]

    def test_list_positions_auth_required(self):
        r = requests.get(f"{API}/os/hr/positions", timeout=15)
        assert r.status_code in (401, 403)

    def test_list_positions_ceo(self, ceo_headers):
        r = requests.get(f"{API}/os/hr/positions", headers=ceo_headers, timeout=15)
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert pytest.position_id in ids

    def test_public_positions_only_open(self):
        r = requests.get(f"{API}/positions", timeout=15)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        for p in arr:
            assert p.get("is_open") is True
            assert "created_by" not in p
            assert "created_by_name" not in p
        assert any(p["id"] == pytest.position_id for p in arr)

    def test_patch_position_close(self, ceo_headers):
        body = {"title": "TEST Video Editor", "department": "Media",
                "description": "Edit videos", "requirements": "Premiere Pro", "is_open": False}
        r = requests.patch(f"{API}/os/hr/positions/{pytest.position_id}",
                           headers=ceo_headers, json=body, timeout=15)
        assert r.status_code == 200
        # Confirm hidden from public
        arr = requests.get(f"{API}/positions", timeout=15).json()
        assert not any(p["id"] == pytest.position_id for p in arr)

    def test_non_admin_cannot_create_position(self, employee_headers):
        body = {"title": "TEST Bad", "is_open": True}
        r = requests.post(f"{API}/os/hr/positions", headers=employee_headers, json=body, timeout=15)
        assert r.status_code == 403, r.text

    def test_delete_position(self, ceo_headers):
        r = requests.delete(f"{API}/os/hr/positions/{pytest.position_id}",
                            headers=ceo_headers, timeout=15)
        assert r.status_code == 200
        # verify gone
        arr = requests.get(f"{API}/os/hr/positions", headers=ceo_headers, timeout=15).json()
        assert not any(p["id"] == pytest.position_id for p in arr)


# ---------- Roles ----------
CUSTOM_ROLE = f"TEST_CustomRole_{uuid.uuid4().hex[:6]}"

class TestRoles:
    def test_create_custom_role_upsert(self, ceo_headers):
        body = {"permissions": ["dashboard.view", "tasks.view"], "description": "Test role"}
        r = requests.put(f"{API}/os/roles/{CUSTOM_ROLE}", headers=ceo_headers, json=body, timeout=15)
        assert r.status_code == 200, r.text
        # verify via list
        listing = requests.get(f"{API}/os/roles", headers=ceo_headers, timeout=15).json()
        names = [x["name"] for x in listing.get("roles", [])]
        assert CUSTOM_ROLE in names

    def test_update_custom_role(self, ceo_headers):
        body = {"permissions": ["tasks.manage"], "description": "updated"}
        r = requests.put(f"{API}/os/roles/{CUSTOM_ROLE}", headers=ceo_headers, json=body, timeout=15)
        assert r.status_code == 200
        listing = requests.get(f"{API}/os/roles", headers=ceo_headers, timeout=15).json()
        role = next(x for x in listing["roles"] if x["name"] == CUSTOM_ROLE)
        assert role["permissions"] == ["tasks.manage"]

    def test_invalid_permissions(self, ceo_headers):
        body = {"permissions": ["not.a.real.perm"], "description": "bad"}
        r = requests.put(f"{API}/os/roles/BadRole_{uuid.uuid4().hex[:4]}",
                         headers=ceo_headers, json=body, timeout=15)
        assert r.status_code == 400
        assert "Invalid permissions" in r.text

    def test_delete_default_role_forbidden(self, ceo_headers):
        r = requests.delete(f"{API}/os/roles/CEO", headers=ceo_headers, timeout=15)
        assert r.status_code == 400
        assert "default" in r.text.lower()

    def test_delete_custom_role(self, ceo_headers):
        r = requests.delete(f"{API}/os/roles/{CUSTOM_ROLE}", headers=ceo_headers, timeout=15)
        assert r.status_code == 200
        listing = requests.get(f"{API}/os/roles", headers=ceo_headers, timeout=15).json()
        names = [x["name"] for x in listing.get("roles", [])]
        assert CUSTOM_ROLE not in names
