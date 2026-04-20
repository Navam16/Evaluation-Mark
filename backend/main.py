"""
EvalX — Class Participation Evaluator API
==========================================
Endpoints:
  POST /api/audio-compare      — Compare professor + student audio
  POST /api/transcript         — Analyse full class transcript
  POST /api/examiner/setup     — Upload or generate question set
  POST /api/examiner/tts       — Sarvam TTS → returns audio bytes
  POST /api/examiner/evaluate  — Evaluate student mic answer
  GET  /api/health
"""

import io, json, os, re, tempfile, httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from groq import Groq

app = FastAPI(title="EvalX API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Clients ───────────────────────────────────────────────────────────────────
def groq_client() -> Groq:
    key = os.environ.get("GROQ_API_KEY", "")
    if not key:
        raise HTTPException(500, "GROQ_API_KEY not set")
    return Groq(api_key=key)

SARVAM_KEY = lambda: os.environ.get("SARVAM_API_KEY", "")

# ── Helpers ───────────────────────────────────────────────────────────────────
def clean_vtt(raw: str) -> str:
    text = re.sub(r"^WEBVTT.*?\n\n", "", raw, flags=re.DOTALL)
    text = re.sub(r"\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}", "", text)
    text = re.sub(r"^\d+\s*$", "", text, flags=re.MULTILINE)
    return re.sub(r"\n{3,}", "\n\n", text).strip()

def parse_json(raw: str) -> dict:
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
    return json.loads(raw)

async def transcribe(file_bytes: bytes, filename: str, client: Groq) -> str:
    suffix = os.path.splitext(filename)[1] or ".mp3"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        with open(tmp_path, "rb") as f:
            result = client.audio.transcriptions.create(
                model="whisper-large-v3-turbo",
                file=f,
                response_format="text",
            )
        return result if isinstance(result, str) else result.text
    finally:
        os.unlink(tmp_path)

async def sarvam_tts(text: str) -> bytes:
    """Call Sarvam AI TTS with speaker Anushka."""
    api_key = SARVAM_KEY()
    if not api_key:
        raise HTTPException(500, "SARVAM_API_KEY not set")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.sarvam.ai/text-to-speech",
            headers={"api-subscription-key": api_key, "Content-Type": "application/json"},
            json={
                "inputs": [text],
                "target_language_code": "en-IN",
                "speaker": "anushka",
                "pitch": 0,
                "pace": 1.0,
                "loudness": 1.5,
                "speech_sample_rate": 22050,
                "enable_preprocessing": True,
                "model": "bulbul:v1",
            },
        )
    if resp.status_code != 200:
        raise HTTPException(500, f"Sarvam TTS error: {resp.text}")
    data = resp.json()
    import base64
    audio_b64 = data.get("audios", [""])[0]
    return base64.b64decode(audio_b64)

# ═══════════════════════════════════════════════════════════════════════════════
#  ENDPOINT 1 — Audio Comparison
# ═══════════════════════════════════════════════════════════════════════════════
AUDIO_COMPARE_PROMPT = """
You are an expert educational analyst.
You will receive two transcripts:
1. PROFESSOR TRANSCRIPT — what the professor taught
2. STUDENT TRANSCRIPT — what the student said

Evaluate the student across these 5 parameters:

1. relevance         (1-10) — How relevant is the student's response to the professor's teaching?
2. conceptual_accuracy (1-10) — Are the concepts the student used correct?
3. fluency           (1-10) — Smooth delivery, minimal filler words
4. critical_thinking (1-10) — Does the student analyse or build on what was taught?
5. communication     (1-10) — Clarity and articulation

Return ONLY valid JSON:
{
  "topic_detected": "<what topic the professor was teaching>",
  "student_name": "<name if mentioned, else 'Student'>",
  "scores": {
    "relevance": 0,
    "conceptual_accuracy": 0,
    "fluency": 0,
    "critical_thinking": 0,
    "communication": 0
  },
  "overall_score": 0.0,
  "grade": "<A/B+/B/C+/C/D>",
  "professor_key_points": ["<point 1>", "<point 2>"],
  "student_covered": ["<point 1>"],
  "student_missed": ["<point 1>"],
  "feedback": {
    "strengths": "<what student did well>",
    "weaknesses": "<where student fell short>",
    "improvement": "<specific actionable steps>"
  },
  "filler_words": ["um", "uh"],
  "word_count": 0
}
"""

@app.post("/api/audio-compare")
async def audio_compare(
    professor_audio: UploadFile = File(...),
    student_audio: UploadFile = File(...),
    student_name: str = Form(default="Student"),
):
    client = groq_client()
    prof_bytes = await professor_audio.read()
    stud_bytes = await student_audio.read()

    prof_text = await transcribe(prof_bytes, professor_audio.filename or "prof.mp3", client)
    stud_text = await transcribe(stud_bytes, student_audio.filename or "stud.mp3", client)

    if not prof_text.strip():
        raise HTTPException(400, "Could not transcribe professor audio")
    if not stud_text.strip():
        raise HTTPException(400, "Could not transcribe student audio")

    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": AUDIO_COMPARE_PROMPT},
            {"role": "user", "content": f"PROFESSOR TRANSCRIPT:\n{prof_text}\n\nSTUDENT TRANSCRIPT:\n{stud_text}\n\nStudent name: {student_name}"},
        ],
        temperature=0.3,
        max_tokens=2048,
        response_format={"type": "json_object"},
    )
    result = parse_json(resp.choices[0].message.content)
    result["professor_transcript"] = prof_text
    result["student_transcript"] = stud_text
    return result


# ═══════════════════════════════════════════════════════════════════════════════
#  ENDPOINT 2 — Transcript Analysis
# ═══════════════════════════════════════════════════════════════════════════════
TRANSCRIPT_PROMPT = """
You are an expert educational analyst. Analyse this class transcript.
Professor name: {professor_name}

Evaluate every student (not the professor) across 5 factors (1-10 each):
1. relevance — On-topic contributions
2. knowledgeability — Subject depth
3. engagement — Active participation
4. critical_thinking — Analysis and reasoning
5. communication — Clarity

Return ONLY valid JSON:
{
  "professor_dashboard": {
    "overall_class_understanding": "<2-4 sentence summary>",
    "topics_covered": ["<topic>"],
    "topics_to_review": ["<topic>"],
    "teaching_feedback": "<advice for professor>",
    "question_mapping": [
      {
        "professor_question": "<question>",
        "students_who_answered": ["<name>"]
      }
    ]
  },
  "student_evaluations": [
    {
      "name": "<name>",
      "scores": {
        "relevance": 0,
        "knowledgeability": 0,
        "engagement": 0,
        "critical_thinking": 0,
        "communication": 0
      },
      "overall_score": 0.0,
      "grade": "<A/B+/B/C+/C/D>",
      "feedback": {
        "strengths": "<strengths>",
        "weaknesses": "<weaknesses>",
        "needs_improvement": "<steps>"
      }
    }
  ]
}
"""

@app.post("/api/transcript")
async def analyse_transcript(
    file: UploadFile = File(...),
    professor_name: str = Form(default="the professor"),
):
    content = await file.read()
    raw = content.decode("utf-8", errors="replace")
    clean = clean_vtt(raw)
    if len(clean) < 50:
        raise HTTPException(400, "Transcript too short")

    client = groq_client()
    prompt = TRANSCRIPT_PROMPT.format(professor_name=professor_name or "the professor")

    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"CLASS TRANSCRIPT:\n\n{clean}"},
        ],
        temperature=0.3,
        max_tokens=4096,
        response_format={"type": "json_object"},
    )
    return parse_json(resp.choices[0].message.content)


# ═══════════════════════════════════════════════════════════════════════════════
#  ENDPOINT 3a — Examiner Setup (upload or generate questions)
# ═══════════════════════════════════════════════════════════════════════════════
QUESTION_GEN_PROMPT = """
You are an expert professor. Based on the topic provided, generate {count} exam questions.
Mix difficulty: easy (30%), medium (50%), hard (20%).

Return ONLY valid JSON:
{
  "topic": "<topic>",
  "questions": [
    {
      "id": 1,
      "question": "<question text>",
      "difficulty": "easy|medium|hard",
      "expected_keywords": ["<keyword1>", "<keyword2>"],
      "ideal_answer_points": ["<point1>", "<point2>"]
    }
  ]
}
"""

@app.post("/api/examiner/setup")
async def examiner_setup(
    mode: str = Form(...),           # "upload" | "generate"
    topic: str = Form(default=""),
    count: int = Form(default=5),
    file: UploadFile = File(default=None),
):
    client = groq_client()

    if mode == "upload" and file:
        content = await file.read()
        raw = content.decode("utf-8", errors="replace")
        # Parse questions from uploaded file
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Extract exam questions from this text and return ONLY valid JSON with structure: {\"topic\": \"<detected topic>\", \"questions\": [{\"id\": 1, \"question\": \"<text>\", \"difficulty\": \"medium\", \"expected_keywords\": [], \"ideal_answer_points\": []}]}"},
                {"role": "user", "content": raw},
            ],
            temperature=0.2,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
        return parse_json(resp.choices[0].message.content)

    elif mode == "generate":
        if not topic.strip():
            raise HTTPException(400, "Topic required for generate mode")
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": QUESTION_GEN_PROMPT.format(count=count)},
                {"role": "user", "content": f"Topic: {topic}"},
            ],
            temperature=0.5,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
        return parse_json(resp.choices[0].message.content)

    raise HTTPException(400, "mode must be 'upload' or 'generate'")


# ═══════════════════════════════════════════════════════════════════════════════
#  ENDPOINT 3b — TTS (Sarvam Anushka speaks the question)
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/api/examiner/tts")
async def examiner_tts(text: str = Form(...)):
    audio_bytes = await sarvam_tts(text)
    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/wav",
        headers={"Content-Disposition": "inline; filename=question.wav"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  ENDPOINT 3c — Evaluate student mic answer
# ═══════════════════════════════════════════════════════════════════════════════
EVAL_ANSWER_PROMPT = """
You are a strict but fair examiner evaluating a student's spoken answer.

Question: {question}
Expected keywords: {keywords}
Ideal answer points: {ideal_points}
Student name: {student_name}

Evaluate the student's answer across 5 parameters (1-10 each):
1. relevance — Did they answer the actual question?
2. conceptual_accuracy — Are the facts/concepts correct?
3. fluency — Smooth speech, minimal filler words
4. critical_thinking — Did they go beyond surface level?
5. communication — Clear and articulate?

Return ONLY valid JSON:
{
  "question": "<question>",
  "student_answer_transcript": "<what student said>",
  "scores": {
    "relevance": 0,
    "conceptual_accuracy": 0,
    "fluency": 0,
    "critical_thinking": 0,
    "communication": 0
  },
  "overall_score": 0.0,
  "grade": "<A/B+/B/C+/C/D>",
  "keywords_used": ["<keyword>"],
  "keywords_missed": ["<keyword>"],
  "points_covered": ["<point>"],
  "points_missed": ["<point>"],
  "feedback": {
    "strengths": "<what was good>",
    "weaknesses": "<what was lacking>",
    "model_answer_hint": "<brief ideal answer hint>"
  },
  "filler_words_detected": ["um", "uh"],
  "word_count": 0
}
"""

@app.post("/api/examiner/evaluate")
async def examiner_evaluate(
    audio: UploadFile = File(...),
    question: str = Form(...),
    expected_keywords: str = Form(default="[]"),
    ideal_answer_points: str = Form(default="[]"),
    student_name: str = Form(default="Student"),
    question_number: int = Form(default=1),
):
    client = groq_client()
    audio_bytes = await audio.read()
    transcript = await transcribe(audio_bytes, audio.filename or "answer.mp3", client)

    if not transcript.strip():
        raise HTTPException(400, "Could not transcribe student answer — please speak clearly")

    try:
        keywords = json.loads(expected_keywords)
        ideal_points = json.loads(ideal_answer_points)
    except:
        keywords, ideal_points = [], []

    prompt = EVAL_ANSWER_PROMPT.format(
        question=question,
        keywords=", ".join(keywords) if keywords else "none specified",
        ideal_points="\n".join(f"- {p}" for p in ideal_points) if ideal_points else "none specified",
        student_name=student_name,
    )

    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Student's spoken answer:\n\n{transcript}"},
        ],
        temperature=0.3,
        max_tokens=1500,
        response_format={"type": "json_object"},
    )
    result = parse_json(resp.choices[0].message.content)
    result["question_number"] = question_number
    result["student_answer_transcript"] = transcript
    return result


# ═══════════════════════════════════════════════════════════════════════════════
#  Health
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "3.0.0", "modes": ["audio-compare", "transcript", "ai-examiner"]}
