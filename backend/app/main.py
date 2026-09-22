import json
import re
from typing import Any

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


SYSTEM_PROMPT = """You are a smart AI career assistant for students and job seekers.
You provide resume analysis, job suggestions, career guidance,
skill gap analysis, and fake job/scam detection.
Be professional, accurate, and concise.
When structured output is requested, return valid JSON only."""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore")

    api_prefix: str = "/api"
    frontend_origins: str = "http://localhost:5173"
    lovable_api_url: str = "https://ai.gateway.lovable.dev/v1/chat/completions"
    lovable_model: str = "google/gemini-2.5-flash"
    lovable_api_key: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""

    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


settings = Settings()
app = FastAPI(title="Career AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)


class JobSuggestionsRequest(BaseModel):
    resumeSummary: str = ""


class ResumeAnalyzeRequest(BaseModel):
    resumeText: str = ""


class ScamDetectRequest(BaseModel):
    jobDescription: str = ""


async def fetch_supabase_user(token: str) -> dict[str, Any] | None:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=500, detail="Supabase authentication is not configured")

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"******",
                "apikey": settings.supabase_anon_key,
            },
        )

    if response.status_code != 200:
        return None

    return response.json()


async def require_authenticated_user(request: Request) -> dict[str, Any]:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    user = await fetch_supabase_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user


async def post_ai_completion(payload: dict[str, Any]) -> httpx.Response:
    if not settings.lovable_api_key:
        raise HTTPException(status_code=500, detail="LOVABLE_API_KEY is not configured")

    async with httpx.AsyncClient(timeout=60) as client:
        return await client.post(
            settings.lovable_api_url,
            headers={
                "Authorization": f"******",
                "Content-Type": "application/json",
            },
            json=payload,
        )


async def stream_ai_completion(payload: dict[str, Any]) -> httpx.Response:
    if not settings.lovable_api_key:
        raise HTTPException(status_code=500, detail="LOVABLE_API_KEY is not configured")

    client = httpx.AsyncClient(timeout=60)
    request = client.build_request(
        "POST",
        settings.lovable_api_url,
        headers={
            "Authorization": f"******",
            "Content-Type": "application/json",
        },
        json=payload,
    )
    response = await client.send(request, stream=True)
    response._backend_client = client
    return response


def parse_json_from_content(content: str) -> dict[str, Any]:
    json_match = re.search(r"\{[\s\S]*\}", content)
    candidate = json_match.group(0) if json_match else content
    return json.loads(candidate)


@app.post(f"{settings.api_prefix}/chat")
async def chat(payload: ChatRequest, _: dict[str, Any] = Depends(require_authenticated_user)):
    response = await stream_ai_completion(
        {
            "model": settings.lovable_model,
            "messages": [{"role": "system", "content": SYSTEM_PROMPT}, *[msg.model_dump() for msg in payload.messages]],
            "stream": True,
        }
    )

    if response.status_code == 429:
        await response.aclose()
        await response._backend_client.aclose()
        return JSONResponse(status_code=429, content={"error": "Rate limit exceeded. Please try again later."})

    if response.status_code == 402:
        await response.aclose()
        await response._backend_client.aclose()
        return JSONResponse(status_code=402, content={"error": "Usage limit reached."})

    if response.status_code >= 400:
        body = await response.aread()
        print("AI gateway error:", response.status_code, body.decode("utf-8", errors="ignore"))
        await response.aclose()
        await response._backend_client.aclose()
        return JSONResponse(status_code=500, content={"error": "AI gateway error"})

    async def event_streamer():
        try:
            async for chunk in response.aiter_raw():
                if chunk:
                    yield chunk
        finally:
            await response.aclose()
            await response._backend_client.aclose()

    return StreamingResponse(event_streamer(), media_type="text/event-stream")


@app.post(f"{settings.api_prefix}/job-suggestions")
async def job_suggestions(payload: JobSuggestionsRequest, _: dict[str, Any] = Depends(require_authenticated_user)) -> JSONResponse:
    resume_summary = payload.resumeSummary
    if not resume_summary:
        return JSONResponse(status_code=400, content={"error": "Please provide a resume summary."})

    prompt = f"""Based on this resume summary, suggest 5-8 relevant job roles with details.
Return JSON only:
{{
  \"suggestions\": [
    {{
      \"title\": \"\",
      \"company_type\": \"\",
      \"salary_range\": \"\",
      \"match_score\": 0,
      \"why_good_fit\": \"\",
      \"skills_to_highlight\": [],
      \"search_query\": \"\"
    }}
  ]
}}

Resume Summary:
{resume_summary}"""

    response = await post_ai_completion(
        {
            "model": settings.lovable_model,
            "messages": [
                {"role": "system", "content": "You are a smart AI career assistant. Return valid JSON only. No markdown, no code blocks."},
                {"role": "user", "content": prompt},
            ],
        }
    )

    if response.status_code >= 400:
        print("AI error:", response.status_code, response.text)
        return JSONResponse(status_code=500, content={"error": "AI suggestion failed"})

    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

    try:
        parsed = parse_json_from_content(content)
    except json.JSONDecodeError:
        parsed = {"raw": content}

    return JSONResponse(content=parsed)


@app.post(f"{settings.api_prefix}/resume-analyze")
async def resume_analyze(payload: ResumeAnalyzeRequest, _: dict[str, Any] = Depends(require_authenticated_user)) -> JSONResponse:
    resume_text = payload.resumeText
    if not resume_text or len(resume_text.strip()) < 20:
        return JSONResponse(status_code=400, content={"error": "Please provide resume text (at least 20 characters)."})

    prompt = f"""Analyze the following resume text.
Extract and return JSON only:
{{
  \"experience_level\": \"\",
  \"skills\": [],
  \"best_job_roles\": [],
  \"missing_skills\": [],
  \"improvement_suggestions\": []
}}

Resume Text:
{resume_text}"""

    response = await post_ai_completion(
        {
            "model": settings.lovable_model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a smart AI career assistant. When structured output is requested, return valid JSON only. No markdown, no code blocks, just raw JSON.",
                },
                {"role": "user", "content": prompt},
            ],
        }
    )

    if response.status_code >= 400:
        print("AI error:", response.status_code, response.text)
        return JSONResponse(status_code=500, content={"error": "AI analysis failed"})

    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

    try:
        parsed = parse_json_from_content(content)
    except json.JSONDecodeError:
        parsed = {"raw": content}

    return JSONResponse(content={"analysis": parsed})


@app.post(f"{settings.api_prefix}/scam-detect")
async def scam_detect(payload: ScamDetectRequest, _: dict[str, Any] = Depends(require_authenticated_user)) -> JSONResponse:
    job_description = payload.jobDescription
    if not job_description or len(job_description.strip()) < 10:
        return JSONResponse(status_code=400, content={"error": "Please provide a job description to analyze."})

    prompt = f"""Analyze this job posting for scam indicators.
Return JSON only:
{{
  \"risk_score\": 0,
  \"scam_likelihood\": \"low | medium | high\",
  \"red_flags\": [],
  \"explanation\": \"\"
}}

Job Posting:
{job_description}"""

    response = await post_ai_completion(
        {
            "model": settings.lovable_model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a smart AI career assistant specializing in detecting fake jobs and scams. Return valid JSON only. No markdown, no code blocks.",
                },
                {"role": "user", "content": prompt},
            ],
        }
    )

    if response.status_code >= 400:
        print("AI error:", response.status_code, response.text)
        return JSONResponse(status_code=500, content={"error": "AI analysis failed"})

    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

    try:
        parsed = parse_json_from_content(content)
    except json.JSONDecodeError:
        parsed = {"raw": content}

    return JSONResponse(content={"result": parsed})
