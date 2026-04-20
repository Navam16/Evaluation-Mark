# EvalX — AI Class Participation Evaluator v3.0

Three evaluation modes powered by Groq + Sarvam AI.

## Modes

| Mode | Description | Tech |
|------|-------------|------|
| 🎙️ Audio Compare | Upload professor + student audio → relevance scoring | Groq Whisper + LLaMA |
| 📄 Transcript | Upload class .txt/.vtt → evaluate all students | LLaMA 3.3 70B |
| 🤖 AI Examiner | Upload/generate questions → Anushka asks → mic answer → grade | Sarvam TTS + Whisper + LLaMA |

## Repo Structure

```
evalx/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   └── UI.jsx
│   │   └── pages/
│   │       ├── AudioCompare.jsx
│   │       ├── Transcript.jsx
│   │       └── Examiner.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── render.yaml
```

## Deploy

### Render (Backend)
- Root Directory: `backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Env vars: `GROQ_API_KEY`, `SARVAM_API_KEY`

### Vercel (Frontend)
- Root Directory: `frontend`
- Framework: Vite
- Build: `npm run build`
- Output: `dist`
- Env var: `VITE_API_URL` = your Render URL

## Local Dev

```bash
# Backend
cd backend
pip install -r requirements.txt
export GROQ_API_KEY=gsk_...
export SARVAM_API_KEY=...
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```
