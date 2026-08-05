"""Backend tests for file uploads (image/video/pdf), account linking,
social/chat url preservation, dashboard finance visibility, and mail permission."""
import io
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback for backend/.env-less setups
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"
CEO_EMAIL = "teameagls0@gmail.com"
CEO_PASSWORD = "URSetup@2026!"


# -------- Fixtures --------
@pytest.fixture(scope="session")
def ceo_token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": CEO_EMAIL, "password": CEO_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"CEO login failed: {r.status_code} {r.text}"
    d = r.json()
    return d.get("access_token") or d.get("token")


@pytest.fixture(scope="session")
def ceo_headers(ceo_token):
    return {"Authorization": f"Bearer {ceo_token}"}


@pytest.fixture(scope="session")
def ceo_user(ceo_headers):
    r = requests.get(f"{API}/auth/me", headers=ceo_headers, timeout=15)
    assert r.status_code == 200
    return r.json()


def _register_and_set_role(ceo_headers, role_name):
    """Create a new user with a specific role via CEO's employee endpoint,
    then log in as that user and return their token."""
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "TestPass@2026"
    cr = requests.post(f"{API}/os/employees",
                       headers=ceo_headers,
                       json={"email": email, "password": password,
                             "name": f"TEST_{role_name}",
                             "role": role_name}, timeout=15)
    assert cr.status_code in (200, 201), f"create employee: {cr.status_code} {cr.text}"
    uid = cr.json()["id"]
    # Also set via multi-role endpoint so permissions get correctly derived
    pr = requests.patch(f"{API}/os/employees/{uid}/roles",
                        headers=ceo_headers,
                        json={"roles": [role_name]}, timeout=15)
    assert pr.status_code == 200, f"role patch: {pr.status_code} {pr.text}"
    lr = requests.post(f"{API}/auth/login",
                       json={"email": email, "password": password}, timeout=15)
    assert lr.status_code == 200, lr.text
    tok = lr.json().get("access_token") or lr.json().get("token")
    return {"token": tok, "user_id": uid, "email": email}


# Minimal valid file byte payloads
PNG_BYTES = (
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
    b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff'
    b'?\x00\x05\xfe\x02\xfe\xa5\x1b\x8fB\x00\x00\x00\x00IEND\xaeB`\x82'
)
# ~200KB "MP4" bytes (ftyp header + padding)
MP4_BYTES = (
    b'\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2mp41'
) + (b'\x00' * (200 * 1024))
PDF_BYTES = b'%PDF-1.4\n%EOF\n'


# -------- File upload tests --------
class TestFileUploads:
    def test_upload_image_png(self, ceo_headers, ceo_user):
        files = {"file": ("test_img.png", io.BytesIO(PNG_BYTES), "image/png")}
        data = {"category": "images"}
        r = requests.post(f"{API}/os/files/upload",
                          headers=ceo_headers, files=files, data=data, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        d = r.json()
        assert d["content_type"] == "image/png"
        assert d["uploader_id"] == ceo_user["id"]
        assert d["uploader_name"] == ceo_user["name"]
        assert d["url"].startswith("/api/files/download/")
        assert d["category"] == "images"
        pytest.file_image = d

    def test_upload_video_mp4(self, ceo_headers, ceo_user):
        files = {"file": ("test_vid.mp4", io.BytesIO(MP4_BYTES), "video/mp4")}
        data = {"category": "videos"}
        r = requests.post(f"{API}/os/files/upload",
                          headers=ceo_headers, files=files, data=data, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        d = r.json()
        assert d["content_type"] == "video/mp4"
        assert d["uploader_id"] == ceo_user["id"]
        assert d["category"] == "videos"
        assert d["size"] > 100000
        pytest.file_video = d

    def test_upload_pdf(self, ceo_headers):
        files = {"file": ("doc.pdf", io.BytesIO(PDF_BYTES), "application/pdf")}
        r = requests.post(f"{API}/os/files/upload",
                          headers=ceo_headers, files=files,
                          data={"category": "documents"}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["content_type"] == "application/pdf"

    def test_download_public_no_auth(self):
        f = getattr(pytest, "file_image", None)
        assert f is not None
        url = f"{BASE_URL}{f['url']}"
        r = requests.get(url, timeout=30)  # no auth
        assert r.status_code == 200
        assert len(r.content) == len(PNG_BYTES)

    def test_list_files_has_uploader_link(self, ceo_headers, ceo_user):
        r = requests.get(f"{API}/os/files", headers=ceo_headers, timeout=15)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) >= 2
        for f in arr:
            assert "uploader_id" in f and f["uploader_id"], f
            assert "uploader_name" in f and f["uploader_name"], f

    def test_list_files_filter_videos(self, ceo_headers):
        r = requests.get(f"{API}/os/files?category=videos", headers=ceo_headers, timeout=15)
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 1
        for f in arr:
            assert f["category"] == "videos"

    def test_delete_file_removes_disk_and_db(self, ceo_headers):
        # Upload a throwaway file
        files = {"file": ("del.png", io.BytesIO(PNG_BYTES), "image/png")}
        u = requests.post(f"{API}/os/files/upload", headers=ceo_headers,
                          files=files, data={"category": "images"}, timeout=15).json()
        fid = u["id"]
        storage_url = f"{BASE_URL}{u['url']}"
        # verify download works pre-delete
        assert requests.get(storage_url, timeout=15).status_code == 200
        # delete
        r = requests.delete(f"{API}/os/files/{fid}", headers=ceo_headers, timeout=15)
        assert r.status_code == 200
        # verify not in list
        arr = requests.get(f"{API}/os/files", headers=ceo_headers, timeout=15).json()
        assert not any(x["id"] == fid for x in arr)
        # verify file gone from disk
        r2 = requests.get(storage_url, timeout=15)
        assert r2.status_code == 404


# -------- Social media media_url preservation --------
class TestSocialMedia:
    def test_create_and_list_social_preserves_media_url(self, ceo_headers):
        f = getattr(pytest, "file_image", None)
        assert f is not None
        media_url = f["url"]
        payload = {
            "platform": "instagram",
            "content": "TEST_social post with image",
            "media_url": media_url,
            "status": "draft",
        }
        r = requests.post(f"{API}/os/social/posts", headers=ceo_headers,
                          json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["media_url"] == media_url
        assert d["platform"] == "instagram"
        pid = d["id"]

        # List and verify
        arr = requests.get(f"{API}/os/social/posts",
                           headers=ceo_headers, timeout=15).json()
        match = [p for p in arr if p["id"] == pid]
        assert match and match[0]["media_url"] == media_url


# -------- Team chat file_url preservation --------
class TestTeamChat:
    def test_post_message_with_file_url(self, ceo_headers):
        # Ensure a channel exists
        chans = requests.get(f"{API}/os/channels", headers=ceo_headers, timeout=15).json()
        assert chans, "no channels returned"
        cid = chans[0]["id"]
        f = getattr(pytest, "file_video", None)
        assert f is not None
        payload = {"channel_id": cid, "text": "TEST_msg with file",
                   "file_url": f["url"]}
        r = requests.post(f"{API}/os/messages", headers=ceo_headers,
                          json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["file_url"] == f["url"]
        # verify persisted in channel list
        msgs = requests.get(f"{API}/os/channels/{cid}/messages",
                            headers=ceo_headers, timeout=15).json()
        match = [m for m in msgs if m["id"] == d["id"]]
        assert match and match[0]["file_url"] == f["url"]


# -------- Dashboard summary revenue visibility --------
class TestDashboardRevenue:
    def test_ceo_sees_revenue(self, ceo_headers):
        r = requests.get(f"{API}/os/dashboard/summary",
                         headers=ceo_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["revenue_visible"] is True
        assert d["revenue_today"] is not None or d["revenue_today"] == 0

    def test_marketing_hides_revenue(self, ceo_headers):
        creds = _register_and_set_role(ceo_headers, "Marketing")
        hdr = {"Authorization": f"Bearer {creds['token']}"}
        r = requests.get(f"{API}/os/dashboard/summary", headers=hdr, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["revenue_visible"] is False
        assert d["revenue_today"] is None


# -------- Mail permission checks --------
class TestMailPermissions:
    def test_ceo_mail_inbox_not_forbidden(self, ceo_headers):
        r = requests.get(f"{API}/os/mail/inbox", headers=ceo_headers, timeout=15)
        # 200 or 500 (gmail not configured) accepted — must NOT be 403
        assert r.status_code != 403, f"CEO should not get 403; got {r.status_code}"

    def test_employee_mail_forbidden(self, ceo_headers):
        creds = _register_and_set_role(ceo_headers, "Employee")
        hdr = {"Authorization": f"Bearer {creds['token']}"}
        r = requests.get(f"{API}/os/mail/inbox", headers=hdr, timeout=15)
        assert r.status_code == 403

    def test_hr_manager_mail_allowed(self, ceo_headers):
        creds = _register_and_set_role(ceo_headers, "HR Manager")
        hdr = {"Authorization": f"Bearer {creds['token']}"}
        r = requests.get(f"{API}/os/mail/inbox", headers=hdr, timeout=15)
        assert r.status_code != 403, f"HR Manager should be allowed; got {r.status_code}"

    def test_marketing_manager_mail_allowed(self, ceo_headers):
        creds = _register_and_set_role(ceo_headers, "Marketing Manager")
        hdr = {"Authorization": f"Bearer {creds['token']}"}
        r = requests.get(f"{API}/os/mail/inbox", headers=hdr, timeout=15)
        assert r.status_code != 403
