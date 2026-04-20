import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Upload, Sparkles, Play, SkipForward, RefreshCw, Volume2 } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";
import { Card, Label, Input, Btn, Spinner, DropZone, ErrorMsg, ScoreBar, GradeBadge, FeedbackCard, Tag, SectionTitle } from "../components/UI.jsx";

const API = import.meta.env.VITE_API_URL || "";

const FACTORS = [
  { key: "relevance",           label: "Relevance",      color: "#06b6d4", icon: "📌" },
  { key: "conceptual_accuracy", label: "Accuracy",       color: "#10b981", icon: "🎯" },
  { key: "fluency",             label: "Fluency",         color: "#8b5cf6", icon: "🎙️" },
  { key: "critical_thinking",   label: "Critical Think", color: "#f59e0b", icon: "💡" },
  { key: "communication",       label: "Communication",  color: "#f97316", icon: "🗣️" },
];

// ── Phase constants ───────────────────────────────────────────────────────────
const PHASE = { SETUP:"setup", READY:"ready", EXAM:"exam", DONE:"done" };

export default function ExaminerPage() {
  const [phase, setPhase]             = useState(PHASE.SETUP);
  const [setupMode, setSetupMode]     = useState("generate"); // "upload"|"generate"
  const [topic, setTopic]             = useState("");
  const [qCount, setQCount]           = useState(5);
  const [qFile, setQFile]             = useState(null);
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [questions, setQuestions]     = useState([]);
  const [qTopic, setQTopic]           = useState("");

  // Exam state
  const [qIdx, setQIdx]               = useState(0);
  const [answers, setAnswers]         = useState([]); // array of result objects
  const [recording, setRecording]     = useState(false);
  const [audioBlob, setAudioBlob]     = useState(null);
  const [ttsPlaying, setTtsPlaying]   = useState(false);
  const [evaluating, setEvaluating]   = useState(false);
  const [answerError, setAnswerError] = useState("");

  const mediaRef    = useRef(null);
  const chunksRef   = useRef([]);
  const audioElRef  = useRef(null);

  // ── Setup ──────────────────────────────────────────────────────────────────
  const handleSetup = async () => {
    if (!studentName.trim()) return setError("Enter student name");
    if (setupMode === "generate" && !topic.trim()) return setError("Enter topic");
    setError(""); setLoading(true);
    try {
      const fd = new FormData();
      fd.append("mode", setupMode);
      fd.append("topic", topic.trim());
      fd.append("count", qCount);
      if (setupMode === "upload" && qFile) fd.append("file", qFile);
      const res = await fetch(`${API}/api/examiner/setup`, { method:"POST", body:fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail||"Setup failed"); }
      const data = await res.json();
      setQuestions(data.questions || []);
      setQTopic(data.topic || topic);
      setPhase(PHASE.READY);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── TTS: Anushka speaks the question ─────────────────────────────────────
  const speakQuestion = async (text) => {
    setTtsPlaying(true);
    try {
      const fd = new FormData();
      fd.append("text", text);
      const res = await fetch(`${API}/api/examiner/tts`, { method:"POST", body:fd });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioElRef.current = audio;
      audio.onended = () => setTtsPlaying(false);
      await audio.play();
    } catch {
      setTtsPlaying(false); // fallback: just show text
    }
  };

  // Auto-speak when question changes during exam
  useEffect(() => {
    if (phase === PHASE.EXAM && questions[qIdx]) {
      speakQuestion(questions[qIdx].question);
    }
  }, [qIdx, phase]);

  // ── Recording ─────────────────────────────────────────────────────────────
  const startRecording = async () => {
    setAudioBlob(null); setAnswerError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
    } catch {
      setAnswerError("Microphone access denied — please allow mic permission");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  // ── Submit answer ─────────────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!audioBlob) return setAnswerError("Record your answer first");
    setAnswerError(""); setEvaluating(true);
    try {
      const q = questions[qIdx];
      const fd = new FormData();
      fd.append("audio", audioBlob, "answer.webm");
      fd.append("question", q.question);
      fd.append("expected_keywords", JSON.stringify(q.expected_keywords || []));
      fd.append("ideal_answer_points", JSON.stringify(q.ideal_answer_points || []));
      fd.append("student_name", studentName);
      fd.append("question_number", qIdx + 1);
      const res = await fetch(`${API}/api/examiner/evaluate`, { method:"POST", body:fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail||"Evaluation failed"); }
      const result = await res.json();
      const newAnswers = [...answers, result];
      setAnswers(newAnswers);
      setAudioBlob(null);

      if (qIdx + 1 < questions.length) {
        setQIdx(qIdx + 1);
      } else {
        setPhase(PHASE.DONE);
      }
    } catch (e) { setAnswerError(e.message); }
    finally { setEvaluating(false); }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (phase === PHASE.DONE) return <FinalReport answers={answers} studentName={studentName} topic={qTopic} onReset={() => { setPhase(PHASE.SETUP); setAnswers([]); setQIdx(0); setAudioBlob(null); }} />;

  if (phase === PHASE.EXAM) {
    const q = questions[qIdx];
    const progress = ((qIdx) / questions.length) * 100;
    return (
      <div style={{ display:"grid", gap:"1.2rem" }} className="fu">

        {/* Progress */}
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ color:"#64748b", fontSize:12, fontWeight:700 }}>Question {qIdx+1} of {questions.length}</span>
            <span style={{ color:"#06b6d4", fontSize:12, fontFamily:"var(--mono)", fontWeight:700 }}>{studentName}</span>
          </div>
          <div style={{ height:6, background:"#162440", borderRadius:99 }}>
            <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#06b6d4,#8b5cf6)", borderRadius:99, transition:"width 0.5s" }}/>
          </div>
        </Card>

        {/* Question card */}
        <Card accent="#8b5cf6" style={{ position:"relative" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <div>
              <Label color="#8b5cf6">🤖 AI Examiner · Anushka is asking</Label>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ background:"#8b5cf615", color:"#8b5cf6", padding:"2px 10px", borderRadius:99, fontSize:11, fontFamily:"var(--mono)", fontWeight:700 }}>
                  {q.difficulty?.toUpperCase()}
                </span>
                {ttsPlaying && (
                  <span style={{ display:"flex", alignItems:"center", gap:5, color:"#8b5cf6", fontSize:11 }}>
                    <Volume2 size={13} style={{ animation:"pulse 1s infinite" }}/> Speaking…
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => speakQuestion(q.question)} disabled={ttsPlaying} style={{ background:"#8b5cf615", border:"1px solid #8b5cf640", borderRadius:8, padding:"6px 12px", color:"#8b5cf6", cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", gap:5, fontFamily:"var(--sans)" }}>
              <Volume2 size={13}/> Replay
            </button>
          </div>
          <div style={{ color:"#e2e8f0", fontSize:17, fontWeight:600, lineHeight:1.6 }}>
            {q.question}
          </div>
          {(q.expected_keywords||[]).length > 0 && (
            <div style={{ marginTop:12 }}>
              <Label color="#475569">💡 Hint keywords</Label>
              {q.expected_keywords.map((k,i) => <Tag key={i} color="#334155">{k}</Tag>)}
            </div>
          )}
        </Card>

        {/* Mic area */}
        <Card accent="#ef4444">
          <Label>🎙️ Your Answer</Label>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, padding:"1.5rem 0" }}>
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={evaluating}
              style={{
                width:80, height:80, borderRadius:"50%", border:"none",
                background: recording ? "#ef444420" : "#06b6d420",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                animation: recording ? "recording 1.2s infinite" : "none",
                transition:"all 0.2s",
              }}
            >
              {recording
                ? <MicOff size={32} color="#ef4444"/>
                : <Mic size={32} color="#06b6d4"/>
              }
            </button>
            <div style={{ color: recording?"#ef4444":"#475569", fontSize:13, fontWeight:700 }}>
              {recording ? "🔴 Recording… click to stop" : audioBlob ? "✅ Answer recorded" : "Click mic to start recording"}
            </div>
            {audioBlob && !recording && (
              <audio controls src={URL.createObjectURL(audioBlob)} style={{ width:"100%", borderRadius:8 }}/>
            )}
          </div>
          <ErrorMsg msg={answerError}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.8rem", marginTop:"1rem" }}>
            <Btn onClick={submitAnswer} disabled={!audioBlob || evaluating} color="#06b6d4">
              {evaluating ? <><Spinner color="#06b6d4"/> Evaluating…</> : <><Play size={15}/> Submit Answer</>}
            </Btn>
            <Btn onClick={() => { setAudioBlob(null); setQIdx(qIdx+1 < questions.length ? qIdx+1 : qIdx); }} disabled={evaluating} color="#475569" style={{ border:"1px solid #162440" }}>
              <SkipForward size={15}/> Skip Question
            </Btn>
          </div>
        </Card>

        {/* Answered so far */}
        {answers.length > 0 && (
          <Card>
            <Label>✅ Answered ({answers.length}/{questions.length})</Label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {answers.map((a,i) => (
                <div key={i} style={{ background:"#10b98115", border:"1px solid #10b98130", borderRadius:8, padding:"5px 12px", color:"#10b981", fontSize:12, fontFamily:"var(--mono)" }}>
                  Q{a.question_number}: {a.overall_score}/10
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  if (phase === PHASE.READY) return (
    <div style={{ display:"grid", gap:"1.2rem" }} className="fu">
      <Card accent="#10b981">
        <div style={{ textAlign:"center", padding:"1.5rem 0" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
          <div style={{ color:"#10b981", fontWeight:800, fontSize:20, marginBottom:8 }}>{questions.length} Questions Ready</div>
          <div style={{ color:"#64748b", fontSize:13 }}>Topic: <span style={{ color:"#e2e8f0" }}>{qTopic}</span></div>
          <div style={{ color:"#64748b", fontSize:13, marginTop:4 }}>Student: <span style={{ color:"#e2e8f0" }}>{studentName}</span></div>
        </div>
        <div style={{ display:"grid", gap:8, marginBottom:"1.5rem" }}>
          {questions.map((q,i) => (
            <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"10px 14px", background:"#080f1c", borderRadius:8, border:"1px solid #162440" }}>
              <span style={{ color:"#334155", fontFamily:"var(--mono)", fontSize:11, minWidth:24, fontWeight:700 }}>Q{i+1}</span>
              <span style={{ color:"#94a3b8", fontSize:13, flex:1 }}>{q.question}</span>
              <span style={{ background: q.difficulty==="easy"?"#10b98115":q.difficulty==="medium"?"#f59e0b15":"#ef444415", color:q.difficulty==="easy"?"#10b981":q.difficulty==="medium"?"#f59e0b":"#ef4444", borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700, fontFamily:"var(--mono)", whiteSpace:"nowrap" }}>
                {q.difficulty}
              </span>
            </div>
          ))}
        </div>
        <Btn onClick={() => setPhase(PHASE.EXAM)} color="#10b981">
          <Play size={16}/> Start Exam — Anushka will ask questions
        </Btn>
      </Card>
      <Btn onClick={() => setPhase(PHASE.SETUP)} color="#475569" style={{ border:"1px solid #162440" }}>← Back to Setup</Btn>
    </div>
  );

  // ── SETUP PHASE ────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"grid", gap:"1.2rem" }} className="fu">
      <Card>
        <Label>Student Name</Label>
        <Input value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="e.g. Rahul Sharma"/>
      </Card>

      <Card>
        <Label>Question Source</Label>
        <div style={{ display:"flex", gap:4, background:"#04080f", borderRadius:10, padding:4, marginBottom:"1rem" }}>
          {[
            { id:"generate", label:"✨ Auto-Generate", desc:"AI creates questions from topic" },
            { id:"upload",   label:"📄 Upload File",   desc:"Upload your question set" },
          ].map(m => (
            <button key={m.id} onClick={() => setSetupMode(m.id)} style={{
              flex:1, padding:"10px 14px", borderRadius:8, border:"none", cursor:"pointer",
              background: setupMode===m.id ? "linear-gradient(135deg,#0d1a30,#101f38)" : "transparent",
              color: setupMode===m.id ? "#e2e8f0" : "#475569",
              fontFamily:"var(--sans)", fontWeight:700, fontSize:13,
              borderBottom: setupMode===m.id ? "2px solid #8b5cf6" : "2px solid transparent",
              transition:"all 0.2s", textAlign:"left",
            }}>
              <div>{m.label}</div>
              <div style={{ fontSize:10, fontWeight:400, color: setupMode===m.id?"#475569":"#334155", marginTop:2 }}>{m.desc}</div>
            </button>
          ))}
        </div>

        {setupMode === "generate" ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"0.8rem" }}>
            <div>
              <Label>Topic</Label>
              <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Value at Risk in Financial Markets"/>
            </div>
            <div>
              <Label>Count</Label>
              <select value={qCount} onChange={e => setQCount(+e.target.value)} style={{ padding:"10px 14px", background:"#080f1c", border:"1.5px solid #162440", borderRadius:10, color:"#e2e8f0", fontFamily:"var(--sans)", fontSize:14, outline:"none" }}>
                {[3,5,7,10].map(n => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>
          </div>
        ) : (
          <DropZone
            accept=".txt,.pdf,.docx"
            label="Upload question set file"
            hint="TXT or PDF with questions listed — AI will parse them"
            onFile={setQFile} file={qFile} color="#8b5cf6"
          />
        )}
      </Card>

      <Card style={{ background:"rgba(139,92,246,0.04)", border:"1px solid #8b5cf615" }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
          <Volume2 size={16} color="#8b5cf6" style={{ marginTop:2, flexShrink:0 }}/>
          <div style={{ color:"#475569", fontSize:12, lineHeight:1.7 }}>
            <span style={{ color:"#8b5cf6", fontWeight:700 }}>Sarvam AI · Anushka: </span>
            Questions will be spoken aloud by Anushka (Sarvam TTS). Student records answer via microphone.
            Groq Whisper transcribes → LLaMA evaluates across 5 dimensions → final report generated.
          </div>
        </div>
      </Card>

      <ErrorMsg msg={error}/>
      <Btn onClick={handleSetup} disabled={loading} color="#8b5cf6">
        {loading ? <><Spinner color="#8b5cf6"/> Preparing questions…</> : <><Sparkles size={16}/> Setup Exam</>}
      </Btn>
    </div>
  );
}

// ── Final Report ──────────────────────────────────────────────────────────────
function FinalReport({ answers, studentName, topic, onReset }) {
  const [selIdx, setSelIdx] = useState(0);
  const sel = answers[selIdx];
  if (!sel) return null;

  const overallAvg = +(answers.map(a => a.overall_score||0).reduce((a,b)=>a+b,0)/answers.length).toFixed(1);
  const grades = { A:0,"B+":0,B:0,"C+":0,C:0,D:0 };
  answers.forEach(a => { if (grades[a.grade] !== undefined) grades[a.grade]++; });
  const topGrade = Object.entries(grades).sort((a,b)=>b[1]-a[1])[0][0];

  const radarData = FACTORS.map(f => ({ factor: f.label, score: (sel.scores||{})[f.key]??0, fullMark:10 }));

  return (
    <div style={{ display:"grid", gap:"1.2rem" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }} className="fu">
        <div>
          <div style={{ fontWeight:800, fontSize:22, color:"#e2e8f0" }}>{studentName}</div>
          <div style={{ color:"#475569", fontSize:12 }}>Topic: {topic} · {answers.length} questions answered</div>
        </div>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          <GradeBadge grade={topGrade}/>
          <div style={{ textAlign:"center" }}>
            <div style={{ color:"#475569", fontSize:10, fontWeight:700 }}>OVERALL AVG</div>
            <div style={{ color:"#06b6d4", fontWeight:900, fontSize:28, fontFamily:"var(--mono)" }}>{overallAvg}/10</div>
          </div>
          <button onClick={onReset} style={{ padding:"7px 16px", borderRadius:8, background:"transparent", border:"1px solid #162440", color:"#64748b", fontSize:12, cursor:"pointer", fontFamily:"var(--sans)" }}>← New Exam</button>
        </div>
      </div>

      {/* Per-question selector */}
      <Card className="fu1">
        <Label>Select Question to Review</Label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {answers.map((a,i) => (
            <button key={i} onClick={() => setSelIdx(i)} style={{
              padding:"6px 14px", borderRadius:8, fontFamily:"var(--mono)", fontWeight:700, fontSize:12,
              border: i===selIdx ? "1.5px solid #06b6d4" : "1.5px solid #162440",
              background: i===selIdx ? "#06b6d415" : "#080f1c",
              color: i===selIdx ? "#06b6d4" : "#64748b", cursor:"pointer",
            }}>
              Q{a.question_number}: {a.overall_score}/10 · {a.grade}
            </button>
          ))}
        </div>
      </Card>

      {/* Selected question detail */}
      <Card accent="#8b5cf6" className="fu2">
        <Label color="#8b5cf6">Question {sel.question_number}</Label>
        <div style={{ color:"#e2e8f0", fontSize:15, fontWeight:600, marginBottom:12 }}>{sel.question}</div>
        <Label color="#475569">Student's Answer</Label>
        <div style={{ color:"#64748b", fontSize:12, fontFamily:"var(--mono)", background:"#04080f", padding:"10px", borderRadius:8, lineHeight:1.7 }}>
          {sel.student_answer_transcript}
        </div>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }} className="fu3">
        <Card>
          <SectionTitle>🕸️ Radar</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#162440"/>
              <PolarAngleAxis dataKey="factor" tick={{ fill:"#64748b", fontSize:10 }}/>
              <PolarRadiusAxis angle={90} domain={[0,10]} tick={{ fill:"#334155", fontSize:8 }}/>
              <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2}/>
            </RadarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionTitle>📊 Scores</SectionTitle>
          {FACTORS.map(f => <ScoreBar key={f.key} label={f.label} score={(sel.scores||{})[f.key]??0} color={f.color} icon={f.icon}/>)}
          <div style={{ marginTop:12, display:"flex", gap:8, flexWrap:"wrap" }}>
            {(sel.filler_words_detected||[]).length > 0 && (sel.filler_words_detected||[]).map((w,i) => <Tag key={i} color="#ef4444">{w}</Tag>)}
          </div>
        </Card>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }} className="fu4">
        <Card>
          <SectionTitle color="#10b981">✅ Keywords Used</SectionTitle>
          {(sel.keywords_used||[]).map((k,i) => <Tag key={i} color="#10b981">{k}</Tag>)}
          <SectionTitle color="#ef4444" style={{ marginTop:12 }}>❌ Keywords Missed</SectionTitle>
          {(sel.keywords_missed||[]).map((k,i) => <Tag key={i} color="#ef4444">{k}</Tag>)}
        </Card>
        <Card>
          <FeedbackCard label="💡 Model Answer Hint" text={sel.feedback?.model_answer_hint} color="#8b5cf6"/>
        </Card>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
        <FeedbackCard label="✅ Strengths" text={sel.feedback?.strengths} color="#10b981"/>
        <FeedbackCard label="⚠️ Weaknesses" text={sel.feedback?.weaknesses} color="#ef4444"/>
        <FeedbackCard label="🎯 Improvement" text={sel.feedback?.improvement} color="#f59e0b"/>
      </div>
    </div>
  );
}
