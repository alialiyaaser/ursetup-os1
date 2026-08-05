"""Iteration 2 regression: messages delete + mark_read + read_by,
HR endpoints (bonuses/deductions/promotions/penalties), public application submit."""
import io
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


@pytest.fixture(scope="module")
def ceo_headers():
    r = requests.post(f"{API}/auth/login",
                      json={"email": CEO_EMAIL, "password": CEO_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json().get("access_token") or r.json().get("token")
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def ceo_user(ceo_headers):
    r = requests.get(f"{API}/auth/me", headers=ceo_headers, timeout=15)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def channel_id(ceo_headers):
    chans = requests.get(f"{API}/os/channels", headers=ceo_headers, timeout=15).json()
    assert chans, "no channels"
    return chans[0]["id"]


@pytest.fixture(scope="module")
def sample_employee(ceo_headers):
    email = f"test_emp_{uuid.uuid4().hex[:8]}@example.com"
    cr = requests.post(f"{API}/os/employees", headers=ceo_headers,
                       json={"email": email, "password": "TestPass@2026",
                             "name": "TEST_Employee_iter2", "role": "Employee"},
                       timeout=15)
    assert cr.status_code in (200, 201), cr.text
    return cr.json()


# -------- Messages: read_by, mark_read, delete --------
class TestMessagesFlow:
    def test_new_message_has_read_by_array(self, ceo_headers, channel_id):
        r = requests.post(f"{API}/os/messages", headers=ceo_headers,
                          json={"channel_id": channel_id, "text": "TEST_iter2 read_by check"},
                          timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "read_by" in d, f"read_by missing: {d}"
        assert isinstance(d["read_by"], list)
        pytest.iter2_msg_id = d["id"]
        pytest.iter2_channel = channel_id

    def test_mark_read_endpoint(self, ceo_headers, channel_id):
        # Need a message NOT authored by CEO. Create employee, get token, post a msg.
        email = f"test_reader_{uuid.uuid4().hex[:8]}@example.com"
        cr = requests.post(f"{API}/os/employees", headers=ceo_headers,
                           json={"email": email, "password": "TestPass@2026",
                                 "name": "TEST_Reader", "role": "Employee"},
                           timeout=15)
        assert cr.status_code in (200, 201)
        lr = requests.post(f"{API}/auth/login",
                           json={"email": email, "password": "TestPass@2026"}, timeout=15)
        tok = lr.json().get("access_token")
        emp_hdr = {"Authorization": f"Bearer {tok}"}
        # Add employee to channel? Try just posting; if 403 that indicates ACL - use general channel
        pm = requests.post(f"{API}/os/messages", headers=emp_hdr,
                           json={"channel_id": channel_id, "text": "TEST_msg_from_employee"},
                           timeout=15)
        # If employee cannot post to this channel, fall back: CEO posts and marks read from another employee session
        if pm.status_code != 200:
            # Just verify mark_read endpoint responds ok when calling with a CEO-owned msg id (edge case)
            r = requests.post(f"{API}/os/messages/mark_read", headers=ceo_headers,
                              json={"message_ids": [pytest.iter2_msg_id]}, timeout=15)
            assert r.status_code == 200
            assert r.json().get("ok") is True
            return
        msg_id = pm.json()["id"]
        r = requests.post(f"{API}/os/messages/mark_read", headers=ceo_headers,
                          json={"message_ids": [msg_id]}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert "updated" in body
        # Verify read_by now contains ceo
        msgs = requests.get(f"{API}/os/channels/{channel_id}/messages",
                            headers=ceo_headers, timeout=15).json()
        target = [m for m in msgs if m["id"] == msg_id]
        assert target
        rb = target[0].get("read_by", [])
        assert any(entry.get("user_id") for entry in rb), f"read_by empty after mark: {rb}"

    def test_delete_own_message_soft_delete(self, ceo_headers, channel_id):
        # CEO posts and deletes own message
        r = requests.post(f"{API}/os/messages", headers=ceo_headers,
                          json={"channel_id": channel_id, "text": "TEST_to_delete"},
                          timeout=15)
        mid = r.json()["id"]
        dr = requests.delete(f"{API}/os/messages/{mid}", headers=ceo_headers, timeout=15)
        assert dr.status_code == 200, dr.text
        # Verify soft-delete in subsequent GET
        msgs = requests.get(f"{API}/os/channels/{channel_id}/messages",
                            headers=ceo_headers, timeout=15).json()
        m = [x for x in msgs if x["id"] == mid]
        assert m, "message removed from list; expected soft delete"
        assert m[0].get("deleted") is True
        assert m[0].get("text") in ("", None)
        assert m[0].get("file_url") in (None, "")


# -------- HR endpoints --------
class TestHREndpoints:
    def test_bonuses_create_and_list(self, ceo_headers, sample_employee):
        payload = {"user_id": sample_employee["id"], "amount": 500,
                   "reason": "TEST_bonus", "date": "2026-01-15"}
        r = requests.post(f"{API}/os/hr/bonuses", headers=ceo_headers, json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d.get("amount") == 500
        assert d.get("user_id") == sample_employee["id"]
        arr = requests.get(f"{API}/os/hr/bonuses", headers=ceo_headers, timeout=15).json()
        assert any(x.get("id") == d["id"] for x in arr)

    def test_deductions_create_and_list(self, ceo_headers, sample_employee):
        payload = {"user_id": sample_employee["id"], "amount": 100,
                   "reason": "TEST_deduction", "date": "2026-01-15"}
        r = requests.post(f"{API}/os/hr/deductions", headers=ceo_headers, json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        assert r.json().get("amount") == 100
        arr = requests.get(f"{API}/os/hr/deductions", headers=ceo_headers, timeout=15).json()
        assert isinstance(arr, list)

    def test_promotion_updates_role(self, ceo_headers, sample_employee):
        new_role = "Support"
        payload = {"user_id": sample_employee["id"],
                   "old_role": "Employee", "new_role": new_role,
                   "to_role": new_role, "effective_date": "2026-01-15",
                   "reason": "TEST_promotion", "date": "2026-01-15"}
        r = requests.post(f"{API}/os/hr/promotions", headers=ceo_headers, json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        # Verify user role updated
        emps = requests.get(f"{API}/os/employees", headers=ceo_headers, timeout=15).json()
        target = [e for e in emps if e["id"] == sample_employee["id"]]
        assert target, "employee missing"
        role = target[0].get("role") or (target[0].get("roles") or [None])[0]
        # role could be role field or in roles list
        assert new_role in [target[0].get("role")] + (target[0].get("roles") or []), \
            f"role not updated: {target[0]}"

    def test_penalties_create_and_list(self, ceo_headers, sample_employee):
        payload = {"user_id": sample_employee["id"], "type": "warning",
                   "reason": "TEST_penalty", "date": "2026-01-15"}
        r = requests.post(f"{API}/os/hr/penalties", headers=ceo_headers, json=payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        arr = requests.get(f"{API}/os/hr/penalties", headers=ceo_headers, timeout=15).json()
        assert isinstance(arr, list) and len(arr) >= 1


# -------- Public application submit --------
class TestPublicApplication:
    def test_submit_no_auth(self):
        # multipart form with optional CV
        files = {"cv": ("cv.pdf", io.BytesIO(b"%PDF-1.4\n%EOF"), "application/pdf")}
        data = {
            "name": "TEST_Applicant Iter2",
            "full_name": "TEST_Applicant Iter2",
            "age": "27",
            "city": "Cairo",
            "email": f"test_app_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "+201234567890",
            "position": "Marketing",
            "years": "2",
            "experience_years": "2",
            "experiences": "TEST experiences summary",
            "cover_letter": "TEST cover letter body",
        }
        r = requests.post(f"{API}/applications", files=files, data=data, timeout=30)
        assert r.status_code in (200, 201), f"{r.status_code} {r.text}"
        d = r.json()
        assert d.get("id"), f"no id: {d}"
