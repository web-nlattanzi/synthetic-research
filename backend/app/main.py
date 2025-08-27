import os, asyncio, json, re, random
from io import BytesIO
from typing import List, Optional
from uuid import uuid4
from datetime import datetime

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from supabase import create_client, Client

# Load env (OPENAI_API_KEY, OPENAI_MODEL, SUPABASE_URL, SUPABASE_KEY)
load_dotenv()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# OpenAI SDK v1+
from openai import OpenAI
_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables are required")

supabase: Client = create_client(supabase_url, supabase_key)

# ---------- FastAPI & CORS ----------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo-friendly; lock down later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Schemas ----------
class Question(BaseModel):
    id: str
    q: str
    type: str = Field(pattern="^(single|multi|open)$")
    options: Optional[List[str]] = None
    prompt: Optional[str] = None

class CreateRun(BaseModel):
    research_type: str = Field("qual", pattern="^(quant|qual|creative)$")
    segment_text: str = ""
    questions: List[Question] = Field(default_factory=list)
    n_respondents: int = Field(25, ge=1, le=500)

# ---------- LLM helpers ----------
def _questions_schema_for_prompt(questions: List[Question]) -> str:
    lines = []
    for qu in questions:
        if qu.type in ("single", "multi"):
            opts = qu.options or ["Yes", "No"]
            lines.append(f'- id: "{qu.q}", type: "{qu.type}", options: {opts}, prompt: "{(qu.prompt or qu.q)}"')
        else:
            lines.append(f'- id: "{qu.q}", type: "open", prompt: "{(qu.prompt or qu.q)}"')
    return "\n".join(lines)

def _response_schema_hint(questions: List[Question]) -> str:
    ex = []
    for qu in questions:
        if qu.type in ("single", "multi"):
            ex.append(f'"{qu.q}": "{(qu.options or ["Yes","No"])[0]}"')
        else:
            ex.append(f'"{qu.q}": "Short verbatim answer here"')
    ex_json = ", ".join(ex)
    return (
        "Return ONLY valid JSON, no code fences, matching: "
        '[{"respondent_id":"R1","answers":{' + ex_json + '}}, {"respondent_id":"R2","answers":{...}}, ...]'
    )

def call_openai_generate(research_type: str, segment_text: str, questions: List[Question], n: int) -> List[dict]:
    schema = _questions_schema_for_prompt(questions)
    json_hint = _response_schema_hint(questions)

    system_msg = (
        "You are a research panel simulator that roleplays as human respondents.\n"
        "Goal: Generate realistic, varied answers from a target audience.\n"
        "Vary tone and word choice, avoid repetition, keep answers consistent with persona.\n"
        "For single-choice questions, ONLY use the listed options exactly.\n"
        "For open-ends, write concise, human-sounding verbatims (2–4 sentences when asked)."
    )

    user_msg = f"""
Target audience (persona description):
{segment_text.strip()}

Research type: {research_type}
Sample size: {n}

Questions (schema-like):
{schema}

{json_hint}
"""

    resp = _client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "system", "content": system_msg},
                  {"role": "user", "content": user_msg}],
        temperature=0.8,
        max_tokens=4096,
    )
    content = (resp.choices[0].message.content or "").strip()
    content = re.sub(r"^```json\s*|\s*```$", "", content, flags=re.IGNORECASE | re.MULTILINE)

    try:
        data = json.loads(content)
        assert isinstance(data, list)
        return data
    except Exception:
        # Fallback if JSON parse fails
        fallback = []
        for i in range(n):
            row = {"respondent_id": f"R{i+1}", "answers": {}}
            for qu in questions:
                if qu.type in ("single", "multi"):
                    row["answers"][qu.q] = random.choice((qu.options or ["Yes","No","Maybe"]))
                else:
                    row["answers"][qu.q] = "Promising overall; would like clearer benefits and pricing context."
            fallback.append(row)
        return fallback

def llm_batch_to_dataframe(batch: List[dict]) -> pd.DataFrame:
    rows = []
    for item in batch:
        rid = item.get("respondent_id") or f"R{len(rows)+1}"
        ans = item.get("answers", {})
        flat = {"respondent_id": rid}
        for qid, val in ans.items():
            col = f"{qid}_verbatim" if isinstance(val, str) and len(val.split()) > 3 else qid
            flat[col] = val
        rows.append(flat)
    return pd.DataFrame(rows)

def build_excel(df: pd.DataFrame, research_type: str) -> bytes:
    buf = BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as xls:
        df.to_excel(xls, index=False, sheet_name="respondent_level")
        if research_type == "quant":
            obj_cols = [c for c in df.columns if df[c].dtype == "object" and c != "respondent_id" and not c.endswith("_verbatim")]
            if obj_cols:
                toplines = (df[obj_cols].apply(lambda s: s.value_counts(normalize=True).round(3)).fillna(0.0))
                toplines.to_excel(xls, sheet_name="toplines")
        else:
            open_cols = [c for c in df.columns if c.endswith("_verbatim")]
            if open_cols:
                df[open_cols].to_excel(xls, index=False, sheet_name="verbatims")
    return buf.getvalue()

async def run_job(run_id: str, payload: CreateRun):
    try:
        # Update status to running
        supabase.table("runs").update({
            "status": "running"
        }).eq("run_id", run_id).execute()
        
        # Generate synthetic data
        batch = call_openai_generate(payload.research_type, payload.segment_text, payload.questions, payload.n_respondents)
        df = llm_batch_to_dataframe(batch)
        xlsx = build_excel(df, payload.research_type)
        
        # Upload to Supabase Storage
        file_path = f"{run_id}.xlsx"
        supabase.storage.from_("excel-exports").upload(file_path, xlsx, {"content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
        
        # Get public URL
        download_url = supabase.storage.from_("excel-exports").get_public_url(file_path)
        
        # Update status to succeeded
        supabase.table("runs").update({
            "status": "succeeded",
            "download_url": download_url,
            "completed_at": datetime.utcnow().isoformat()
        }).eq("run_id", run_id).execute()
        
    except Exception as e:
        # Update status to failed
        supabase.table("runs").update({
            "status": "failed",
            "error_message": str(e),
            "completed_at": datetime.utcnow().isoformat()
        }).eq("run_id", run_id).execute()

@app.post("/api/runs")
async def create_run(payload: CreateRun):
    run_id = str(uuid4())
    
    # Insert run into Supabase
    run_data = {
        "run_id": run_id,
        "status": "queued",
        "research_type": payload.research_type,
        "n_respondents": payload.n_respondents,
        "audience_description": payload.segment_text,
        "questions_json": [q.dict() for q in payload.questions],
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = supabase.table("runs").insert(run_data).execute()
    
    # Start background job
    asyncio.create_task(run_job(run_id, payload))
    
    return {"run_id": run_id, "status": "queued", "download_url": f"/api/runs/{run_id}/download"}

@app.get("/api/runs/{run_id}")
async def run_status(run_id: str):
    result = supabase.table("runs").select("*").eq("run_id", run_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Run not found")
    
    run = result.data[0]
    return {
        "run_id": run_id,
        "status": run["status"],
        "download_url": f"/api/runs/{run_id}/download" if run["status"] == "succeeded" else None,
        "error_message": run.get("error_message"),
        "created_at": run["created_at"],
        "completed_at": run.get("completed_at")
    }

@app.get("/api/runs/{run_id}/download")
async def run_download(run_id: str):
    result = supabase.table("runs").select("*").eq("run_id", run_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Run not found")
    
    run = result.data[0]
    
    if run["status"] != "succeeded" or not run.get("download_url"):
        raise HTTPException(status_code=400, detail="Download not ready")
    
    # Redirect to Supabase Storage URL
    return RedirectResponse(url=run["download_url"])

@app.get("/api/runs/{run_id}/preview")
async def run_preview(run_id: str):
    """Get a preview of the run data for visualization"""
    result = supabase.table("runs").select("*").eq("run_id", run_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Run not found")
    
    run = result.data[0]
    
    if run["status"] != "succeeded":
        raise HTTPException(status_code=400, detail="Run not completed")
    
    # For now, return basic run info - could be enhanced to parse Excel data
    return {
        "run_id": run_id,
        "research_type": run["research_type"],
        "n_respondents": run["n_respondents"],
        "questions": run["questions_json"],
        "status": run["status"]
    }