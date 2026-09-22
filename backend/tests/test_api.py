from fastapi.testclient import TestClient

from backend.app.main import app, require_authenticated_user


class FakeJsonResponse:
    def __init__(self, status_code: int, payload: dict, text: str = ""):
        self.status_code = status_code
        self._payload = payload
        self.text = text

    def json(self):
        return self._payload


class FakeStreamResponse:
    def __init__(self, status_code: int, chunks: list[bytes] | None = None):
        self.status_code = status_code
        self._chunks = chunks or []
        self._backend_client = self

    async def aiter_raw(self):
        for chunk in self._chunks:
            yield chunk

    async def aread(self):
        return b""

    async def aclose(self):
        return None


def _override_auth():
    return {"id": "user-1"}


def test_auth_required_for_chat():
    client = TestClient(app)
    response = client.post("/api/chat", json={"messages": []})
    assert response.status_code == 401


def test_resume_analyze_validation():
    app.dependency_overrides[require_authenticated_user] = _override_auth
    client = TestClient(app)
    response = client.post("/api/resume-analyze", json={"resumeText": "too short"})
    assert response.status_code == 400
    assert response.json() == {"error": "Please provide resume text (at least 20 characters)."}
    app.dependency_overrides.clear()


def test_job_suggestions_success(monkeypatch):
    app.dependency_overrides[require_authenticated_user] = _override_auth

    async def fake_post_ai_completion(_payload):
        return FakeJsonResponse(
            200,
            {"choices": [{"message": {"content": '{"suggestions":[{"title":"Backend Engineer"}]}'}}]},
        )

    monkeypatch.setattr("backend.app.main.post_ai_completion", fake_post_ai_completion)

    client = TestClient(app)
    response = client.post("/api/job-suggestions", json={"resumeSummary": "Python and APIs"})
    assert response.status_code == 200
    assert response.json()["suggestions"][0]["title"] == "Backend Engineer"
    app.dependency_overrides.clear()


def test_scam_detect_raw_fallback(monkeypatch):
    app.dependency_overrides[require_authenticated_user] = _override_auth

    async def fake_post_ai_completion(_payload):
        return FakeJsonResponse(200, {"choices": [{"message": {"content": "not-json"}}]})

    monkeypatch.setattr("backend.app.main.post_ai_completion", fake_post_ai_completion)

    client = TestClient(app)
    response = client.post("/api/scam-detect", json={"jobDescription": "This is a suspicious posting text"})
    assert response.status_code == 200
    assert response.json() == {"result": {"raw": "not-json"}}
    app.dependency_overrides.clear()


def test_chat_stream_success(monkeypatch):
    app.dependency_overrides[require_authenticated_user] = _override_auth

    async def fake_stream_ai_completion(_payload):
        return FakeStreamResponse(200, [b"data: {\"choices\":[{\"delta\":{\"content\":\"Hi\"}}]}\n\n", b"data: [DONE]\n\n"])

    monkeypatch.setattr("backend.app.main.stream_ai_completion", fake_stream_ai_completion)

    client = TestClient(app)
    response = client.post("/api/chat", json={"messages": [{"role": "user", "content": "Hello"}]})
    assert response.status_code == 200
    assert "data:" in response.text
    app.dependency_overrides.clear()
