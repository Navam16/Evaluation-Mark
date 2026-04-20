import { useState } from "react";
import { FileText, Users, GraduationCap, ChevronDown, ChevronUp, Zap } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Card, Label, Input, Btn, Spinner, DropZone, ErrorMsg, ScoreBar, GradeBadge, FeedbackCard, Tag, SectionTitle } from "../components/UI.jsx";

const API = import.meta.env.VITE_API_URL || "";

const FACTORS = [
  { key: "relevance",        label: "Relevance",      color: "#06b6d4", icon: "📌" },
  { key: "knowledgeability", label: "Knowledge",      color: "#10b981", icon: "🧠" },
  { key: "engagement",       label: "Engagement",     color: "#8b5cf6", icon: "🙋" },
  { key: "critical_thinking",label: "Critical Think", color: "#f59e0b", icon: "💡" },
  { key: "communication",    label: "Communication",  color: "#f97316", icon: "🗣️" },
];

export default function TranscriptPage() {
  const [file, setFile]         = useState(null);
  const [profName, setProfName] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [result, setResult]     = useState(null);
  const [view, setView]         = useState("prof"); // "prof"|"student"

  const submit = async () => {
    if (!file) return setError("Upload a transcript file");
    if (!profName.trim()) return setError("Enter professor name");
    setError(""); setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("professor_name", profName.trim());
      const res = await fetch(`${API}/api/transcript`, { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Server error"); }
      setResult(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (result) return (
    <div>
      <div style={{ display: "flex", gap: 4, background: "#080f1c", borderRadius: 12, padding: 4, border: "1px solid #162440", marginBottom: "1.2rem" }} className="fu">
        {[{ id:"prof", label:"📋 Professor Dashboard", icon: Users }, { id:"student", label:"🎓 Student Dashboard", icon: GraduationCap }].map(t => (
          <button key={t.id} onClick={() => setView(t.id)} style={{
            flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: view===t.id ? "linear-gradient(135deg,#0d1a30,#101f38)" : "transparent",
            color: view===t.id ? "#e2e8f0" : "#475569",
            fontFamily: "var(--sans)", fontWeight: 700, fontSize: 13,
            borderBottom: view===t.id ? "2px solid #06b6d4" : "2px solid transparent",
            transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
        <button onClick={() => setResult(null)} style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #162440", color: "#475569", fontSize: 12, cursor: "pointer", fontFamily: "var(--sans)" }}>← New</button>
      </div>
      {view === "prof" ? <ProfView data={result} /> : <StudentView students={result.student_evaluations || []} />}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: "1.2rem" }} className="fu">
      <Card>
        <Label>Professor's Name</Label>
        <Input value={profName} onChange={e => setProfName(e.target.value)} placeholder="e.g. Dr. Arjun Mehta" />
      </Card>
      <Card>
        <Label>Class Transcript</Label>
        <DropZone
          accept=".txt,.vtt"
          label="Upload class transcript"
          hint="Zoom .vtt, Google Meet .txt, or plain Speaker: text format"
          onFile={setFile} file={file}
        />
      </Card>
      <ErrorMsg msg={error} />
      <Btn onClick={submit} disabled={loading} color="#06b6d4">
        {loading ? <><Spinner color="#06b6d4" /> Analysing transcript…</> : <><Zap size={16} /> Analyse Transcript</>}
      </Btn>
    </div>
  );
}

// ── Professor View ────────────────────────────────────────────────────────────
function ProfView({ data }) {
  const pd = data.professor_dashboard || {};
  const se = data.student_evaluations || [];
  const [openQ, setOpenQ] = useState(null);

  const rows = se.map(s => {
    const sc = s.scores || {};
    const avg = +(Object.values(sc).reduce((a,b)=>a+b,0)/Object.values(sc).length).toFixed(1);
    return { ...s, avg };
  }).sort((a,b) => b.avg - a.avg);

  return (
    <div style={{ display: "grid", gap: "1.2rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="fu">
        <Card>
          <Label>📊 Class Understanding</Label>
          <div style={{ color: "#94a3b8", lineHeight: 1.7, fontSize: 13 }}>{pd.overall_class_understanding}</div>
        </Card>
        <Card>
          <Label>💡 Teaching Feedback</Label>
          <div style={{ color: "#94a3b8", lineHeight: 1.7, fontSize: 13 }}>{pd.teaching_feedback}</div>
        </Card>
      </div>

      {(pd.topics_covered||[]).length > 0 && (
        <Card className="fu1">
          <Label color="#10b981">✅ Topics Covered</Label>
          {pd.topics_covered.map((t,i) => <Tag key={i} color="#10b981">{t}</Tag>)}
        </Card>
      )}

      {(pd.topics_to_review||[]).length > 0 && (
        <Card className="fu1">
          <Label color="#ef4444">🔖 Topics to Review</Label>
          {pd.topics_to_review.map((t,i) => <Tag key={i} color="#ef4444">{t}</Tag>)}
        </Card>
      )}

      {(pd.question_mapping||[]).length > 0 && (
        <Card className="fu2">
          <SectionTitle>❓ Question Mapping</SectionTitle>
          {pd.question_mapping.map((q,i) => (
            <div key={i} style={{ marginBottom: 8, borderRadius: 8, overflow: "hidden", border: "1px solid #162440" }}>
              <button
                onClick={() => setOpenQ(openQ===i ? null : i)}
                style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#080f1c", border:"none", color:"#e2e8f0", padding:"11px 14px", cursor:"pointer", textAlign:"left", fontSize:13, fontFamily:"var(--sans)", fontWeight:600 }}
              >
                <span>Q{i+1}: {q.professor_question}</span>
                {openQ===i ? <ChevronUp size={14} color="#475569"/> : <ChevronDown size={14} color="#475569"/>}
              </button>
              {openQ===i && (
                <div style={{ padding:"10px 14px", background:"#0b1526" }}>
                  {(q.students_who_answered||[]).length > 0
                    ? q.students_who_answered.map((s,j) => <Tag key={j} color="#10b981">👤 {s}</Tag>)
                    : <span style={{ color:"#ef4444", fontSize:12 }}>⚠️ No students answered</span>
                  }
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {rows.length > 0 && (
        <Card className="fu3">
          <SectionTitle>📈 Full Participation Summary</SectionTitle>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #162440" }}>
                  {["#","Student","Relevance","Knowledge","Engagement","Critical","Communication","Grade","Avg"].map(h => (
                    <th key={h} style={{ padding:"8px 10px", color:"#475569", fontWeight:700, textAlign:"left", fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i) => (
                  <tr key={i} style={{ borderBottom:"1px solid #0d1a30" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#0b1526"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                  >
                    <td style={{ padding:"9px 10px", color:"#334155", fontFamily:"var(--mono)" }}>#{i+1}</td>
                    <td style={{ padding:"9px 10px", color:"#e2e8f0", fontWeight:700 }}>{r.name}</td>
                    {["relevance","knowledgeability","engagement","critical_thinking","communication"].map(k => (
                      <td key={k} style={{ padding:"9px 10px", color:"#64748b", fontFamily:"var(--mono)", textAlign:"center" }}>{(r.scores||{})[k]??"-"}</td>
                    ))}
                    <td style={{ padding:"9px 10px" }}><span style={{ color: "#06b6d4", fontFamily:"var(--mono)", fontWeight:700 }}>{r.grade}</span></td>
                    <td style={{ padding:"9px 10px" }}><span style={{ background:"#06b6d415", color:"#06b6d4", borderRadius:6, padding:"2px 8px", fontWeight:800, fontFamily:"var(--mono)" }}>{r.avg}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Student View ──────────────────────────────────────────────────────────────
function StudentView({ students }) {
  const [sel, setSel] = useState(students[0]?.name || "");
  const s = students.find(x => x.name === sel) || students[0];
  if (!s) return <Card><div style={{ color:"#475569" }}>No student data</div></Card>;

  const sc = s.scores || {};
  const avg = +(Object.values(sc).reduce((a,b)=>a+b,0)/Object.values(sc).length).toFixed(1);
  const radarData = FACTORS.map(f => ({ factor: f.label, score: sc[f.key]??0, fullMark:10 }));

  const allAvgs = students.map(x => +(Object.values(x.scores||{}).reduce((a,b)=>a+b,0)/Object.values(x.scores||{}).length).toFixed(1));
  const classAvg = +(allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length).toFixed(1);

  const barData = students.map(x => ({
    name: x.name.split(" ")[0],
    avg: +(Object.values(x.scores||{}).reduce((a,b)=>a+b,0)/Object.values(x.scores||{}).length).toFixed(1),
    full: x.name,
  }));

  return (
    <div style={{ display:"grid", gap:"1.2rem" }}>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }} className="fu">
        {students.map(x => (
          <button key={x.name} onClick={() => setSel(x.name)} style={{
            padding:"6px 16px", borderRadius:99, fontFamily:"var(--sans)", fontWeight:700, fontSize:12,
            border: x.name===sel ? "1.5px solid #06b6d4" : "1.5px solid #162440",
            background: x.name===sel ? "#06b6d415" : "transparent",
            color: x.name===sel ? "#06b6d4" : "#475569", cursor:"pointer", transition:"all 0.15s",
          }}>{x.name}</button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"0.7rem" }} className="fu1">
        {FACTORS.map(f => (
          <Card key={f.key} style={{ padding:"0.9rem", textAlign:"center" }}>
            <div style={{ fontSize:20, marginBottom:5 }}>{f.icon}</div>
            <div style={{ color:"#334155", fontSize:9, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>{f.label}</div>
            <div style={{ color:f.color, fontWeight:800, fontSize:20, fontFamily:"var(--mono)", marginTop:4 }}>{sc[f.key]??"-"}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }} className="fu2">
        <Card>
          <SectionTitle>🕸️ Radar</SectionTitle>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#162440"/>
              <PolarAngleAxis dataKey="factor" tick={{ fill:"#64748b", fontSize:10 }}/>
              <PolarRadiusAxis angle={90} domain={[0,10]} tick={{ fill:"#334155", fontSize:8 }}/>
              <Radar dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} strokeWidth={2}/>
            </RadarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionTitle>📊 Scores</SectionTitle>
          {FACTORS.map(f => <ScoreBar key={f.key} label={f.label} score={sc[f.key]??0} color={f.color} icon={f.icon}/>)}
          <div style={{ marginTop:14, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"#06b6d410", borderRadius:8 }}>
            <span style={{ color:"#94a3b8", fontSize:12, fontWeight:600 }}>Average</span>
            <span style={{ color:"#06b6d4", fontWeight:900, fontFamily:"var(--mono)" }}>{avg}/10 · <span style={{ color: s.grade==="A"?"#10b981":"#f59e0b" }}>{s.grade}</span></span>
          </div>
        </Card>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }} className="fu3">
        <FeedbackCard label="✅ Strengths" text={s.feedback?.strengths} color="#10b981"/>
        <FeedbackCard label="⚠️ Weaknesses" text={s.feedback?.weaknesses} color="#ef4444"/>
        <FeedbackCard label="🎯 Improvement" text={s.feedback?.needs_improvement} color="#f59e0b"/>
      </div>

      {students.length > 1 && (
        <Card className="fu4">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <SectionTitle>🏆 Class Comparison</SectionTitle>
            <div style={{ display:"flex", gap:20 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ color:"#334155", fontSize:9, fontWeight:700 }}>CLASS AVG</div>
                <div style={{ color:"#94a3b8", fontFamily:"var(--mono)", fontWeight:700 }}>{classAvg}</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ color:"#334155", fontSize:9, fontWeight:700 }}>YOUR SCORE</div>
                <div style={{ color:"#06b6d4", fontFamily:"var(--mono)", fontWeight:700 }}>{avg}</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ color:"#334155", fontSize:9, fontWeight:700 }}>DELTA</div>
                <div style={{ color: avg>=classAvg?"#10b981":"#ef4444", fontFamily:"var(--mono)", fontWeight:700 }}>{avg>=classAvg?"+":""}{(avg-classAvg).toFixed(1)}</div>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fill:"#64748b", fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,10]} tick={{ fill:"#334155", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:"#0d1a30", border:"1px solid #162440", borderRadius:8, color:"#e2e8f0" }} formatter={(v,_,p) => [v+"/10", p.payload.full]}/>
              <Bar dataKey="avg" radius={[6,6,0,0]}>
                {barData.map((d,i) => <Cell key={i} fill={d.full===sel?"#06b6d4":"#162440"}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
