import { useState } from "react";
import { Mic, Play, BarChart2, BookOpen } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from "recharts";
import { Card, Label, Input, Btn, Spinner, DropZone, ErrorMsg, ScoreBar, GradeBadge, FeedbackCard, Tag, SectionTitle } from "../components/UI.jsx";

const API = import.meta.env.VITE_API_URL || "";

const FACTORS = [
  { key: "relevance",           label: "Relevance",        color: "#06b6d4", icon: "📌" },
  { key: "conceptual_accuracy", label: "Accuracy",         color: "#10b981", icon: "🎯" },
  { key: "fluency",             label: "Fluency",           color: "#8b5cf6", icon: "🎙️" },
  { key: "critical_thinking",   label: "Critical Think",   color: "#f59e0b", icon: "💡" },
  { key: "communication",       label: "Communication",    color: "#f97316", icon: "🗣️" },
];

export default function AudioComparePage() {
  const [profFile, setProfFile]   = useState(null);
  const [studFile, setStudFile]   = useState(null);
  const [name, setName]           = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [result, setResult]       = useState(null);

  const submit = async () => {
    if (!profFile) return setError("Upload professor audio");
    if (!studFile) return setError("Upload student audio");
    setError(""); setLoading(true);
    try {
      const fd = new FormData();
      fd.append("professor_audio", profFile);
      fd.append("student_audio", studFile);
      fd.append("student_name", name.trim() || "Student");
      const res = await fetch(`${API}/api/audio-compare`, { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Server error"); }
      setResult(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (result) return <Result data={result} onReset={() => setResult(null)} />;

  return (
    <div style={{ display: "grid", gap: "1.2rem" }} className="fu">
      <Card>
        <Label>Student Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma" />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <Card accent="#06b6d4">
          <Label color="#06b6d4">👨‍🏫 Professor Audio</Label>
          <DropZone
            accept=".mp3,.wav,.m4a,.ogg,.webm"
            label="Upload professor recording"
            hint="MP3, WAV, M4A · lecture or explanation audio"
            onFile={setProfFile} file={profFile} color="#06b6d4"
          />
        </Card>
        <Card accent="#10b981">
          <Label color="#10b981">🎓 Student Audio</Label>
          <DropZone
            accept=".mp3,.wav,.m4a,.ogg,.webm"
            label="Upload student recording"
            hint="MP3, WAV, M4A · student's spoken response"
            onFile={setStudFile} file={studFile} color="#10b981"
          />
        </Card>
      </div>

      <Card style={{ background: "rgba(6,182,212,0.05)", border: "1px solid #06b6d415" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <BarChart2 size={16} color="#06b6d4" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.7 }}>
            <span style={{ color: "#06b6d4", fontWeight: 700 }}>How it works: </span>
            Groq Whisper transcribes both audios → LLaMA compares them → scores student on
            Relevance, Conceptual Accuracy, Fluency, Critical Thinking & Communication.
          </div>
        </div>
      </Card>

      <ErrorMsg msg={error} />
      <Btn onClick={submit} disabled={loading} color="#06b6d4">
        {loading ? <><Spinner color="#06b6d4" /> Analysing…</> : <><Mic size={16} /> Compare & Evaluate</>}
      </Btn>
    </div>
  );
}

function Result({ data, onReset }) {
  const sc = data.scores || {};
  const radarData = FACTORS.map(f => ({ factor: f.label, score: sc[f.key] ?? 0, fullMark: 10 }));

  return (
    <div style={{ display: "grid", gap: "1.2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="fu">
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#e2e8f0" }}>{data.student_name}</div>
          <div style={{ color: "#475569", fontSize: 12 }}>Topic: {data.topic_detected}</div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <GradeBadge grade={data.grade} />
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#475569", fontSize: 10, fontWeight: 700 }}>OVERALL</div>
            <div style={{ color: "#06b6d4", fontWeight: 900, fontSize: 28, fontFamily: "var(--mono)" }}>{data.overall_score}<span style={{ fontSize: 12, color: "#334155" }}>/10</span></div>
          </div>
          <button onClick={onReset} style={{ padding: "7px 16px", borderRadius: 8, background: "transparent", border: "1px solid #162440", color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "var(--sans)" }}>← New</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="fu1">
        <Card>
          <SectionTitle>🕸️ Performance Radar</SectionTitle>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#162440" />
              <PolarAngleAxis dataKey="factor" tick={{ fill: "#64748b", fontSize: 10, fontFamily: "Space Grotesk" }} />
              <PolarRadiusAxis angle={90} domain={[0,10]} tick={{ fill: "#334155", fontSize: 8 }} />
              <Radar dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionTitle>📊 Score Breakdown</SectionTitle>
          {FACTORS.map(f => <ScoreBar key={f.key} label={f.label} score={sc[f.key]??0} color={f.color} icon={f.icon} />)}
          {data.filler_words?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <Label color="#ef4444">Filler Words</Label>
              {data.filler_words.map((w,i) => <Tag key={i} color="#ef4444">{w}</Tag>)}
            </div>
          )}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="fu2">
        <Card>
          <SectionTitle color="#10b981">✅ Professor Key Points</SectionTitle>
          {(data.professor_key_points||[]).map((p,i) => (
            <div key={i} style={{ color: "#94a3b8", fontSize: 13, padding: "5px 0", borderBottom: "1px solid #162440", lineHeight: 1.6 }}>• {p}</div>
          ))}
        </Card>
        <Card>
          <SectionTitle color="#10b981">✅ Student Covered</SectionTitle>
          {(data.student_covered||[]).map((p,i) => <Tag key={i} color="#10b981">{p}</Tag>)}
          <SectionTitle color="#ef4444" style={{ marginTop: 14 }}>❌ Student Missed</SectionTitle>
          {(data.student_missed||[]).map((p,i) => <Tag key={i} color="#ef4444">{p}</Tag>)}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }} className="fu3">
        <FeedbackCard label="✅ Strengths" text={data.feedback?.strengths} color="#10b981" />
        <FeedbackCard label="⚠️ Weaknesses" text={data.feedback?.weaknesses} color="#ef4444" />
        <FeedbackCard label="🎯 Improvement" text={data.feedback?.improvement} color="#f59e0b" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="fu4">
        <Card>
          <Label>👨‍🏫 Professor Transcript</Label>
          <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.7, fontFamily: "var(--mono)", maxHeight: 150, overflowY: "auto", background: "#04080f", padding: "10px", borderRadius: 8 }}>
            {data.professor_transcript}
          </div>
        </Card>
        <Card>
          <Label>🎓 Student Transcript</Label>
          <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.7, fontFamily: "var(--mono)", maxHeight: 150, overflowY: "auto", background: "#04080f", padding: "10px", borderRadius: 8 }}>
            {data.student_transcript}
          </div>
        </Card>
      </div>
    </div>
  );
}
