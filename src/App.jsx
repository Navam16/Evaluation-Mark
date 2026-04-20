import { useState } from "react";
import { Mic, FileText, Brain } from "lucide-react";
import AudioComparePage from "./pages/AudioCompare.jsx";
import TranscriptPage   from "./pages/Transcript.jsx";
import ExaminerPage     from "./pages/Examiner.jsx";

const PAGES = [
  {
    id:    "audio",
    label: "Audio Compare",
    icon:  Mic,
    color: "#06b6d4",
    desc:  "Compare professor & student audio",
    page:  AudioComparePage,
  },
  {
    id:    "transcript",
    label: "Transcript",
    icon:  FileText,
    color: "#10b981",
    desc:  "Analyse full class transcript",
    page:  TranscriptPage,
  },
  {
    id:    "examiner",
    label: "AI Examiner",
    icon:  Brain,
    color: "#8b5cf6",
    desc:  "Live Q&A with Anushka (Sarvam TTS)",
    page:  ExaminerPage,
  },
];

export default function App() {
  const [active, setActive] = useState("audio");
  const current = PAGES.find(p => p.id === active);
  const PageComponent = current.page;

  return (
    <div style={{ minHeight:"100vh", display:"flex" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: "linear-gradient(180deg,#060d1a,#04080f)",
        borderRight: "1px solid #162440",
        display: "flex", flexDirection: "column",
        padding: "1.5rem 0", position: "sticky", top: 0, height: "100vh",
      }}>
        {/* Logo */}
        <div style={{ padding: "0 1.2rem 1.5rem", borderBottom: "1px solid #162440" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:"linear-gradient(135deg,#06b6d420,#8b5cf620)",
              border:"1px solid #06b6d430",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:18,
            }}>🏛️</div>
            <div>
              <div style={{ fontWeight:800, fontSize:16, color:"#e2e8f0", letterSpacing:"-0.01em" }}>EvalX</div>
              <div style={{ color:"#334155", fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>AI Evaluator</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"1rem 0.8rem", display:"flex", flexDirection:"column", gap:4 }}>
          <div style={{ color:"#334155", fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", padding:"0 0.5rem", marginBottom:8 }}>Modes</div>
          {PAGES.map(p => {
            const Icon = p.icon;
            const isActive = active === p.id;
            return (
              <button key={p.id} onClick={() => setActive(p.id)} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer",
                background: isActive ? `${p.color}15` : "transparent",
                borderLeft: isActive ? `3px solid ${p.color}` : "3px solid transparent",
                textAlign:"left", transition:"all 0.15s", width:"100%",
              }}>
                <Icon size={16} color={isActive ? p.color : "#334155"} style={{ flexShrink:0 }}/>
                <div>
                  <div style={{ color: isActive ? "#e2e8f0" : "#475569", fontWeight:700, fontSize:13, fontFamily:"var(--sans)" }}>{p.label}</div>
                  <div style={{ color: isActive ? "#475569" : "#334155", fontSize:10, marginTop:1 }}>{p.desc}</div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:"1rem 1.2rem", borderTop:"1px solid #162440" }}>
          <div style={{ color:"#334155", fontSize:10, lineHeight:1.6 }}>
            Powered by<br/>
            <span style={{ color:"#06b6d4" }}>Groq</span> · <span style={{ color:"#8b5cf6" }}>Sarvam AI</span><br/>
            <span style={{ color:"#1e3460" }}>LLaMA 3.3 · Whisper · Anushka</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex:1, overflowY:"auto" }}>
        {/* Page header */}
        <div style={{
          background:"linear-gradient(180deg,#080f1c,#04080f)",
          borderBottom:"1px solid #162440",
          padding:"1.2rem 2rem",
          position:"sticky", top:0, zIndex:50,
          display:"flex", alignItems:"center", gap:14,
        }}>
          {(() => { const Icon = current.icon; return <Icon size={20} color={current.color}/>; })()}
          <div>
            <div style={{ fontWeight:800, fontSize:17, color:"#e2e8f0" }}>{current.label}</div>
            <div style={{ color:"#334155", fontSize:11 }}>{current.desc}</div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
            {PAGES.filter(p => p.id !== active).map(p => {
              const Icon = p.icon;
              return (
                <button key={p.id} onClick={() => setActive(p.id)} style={{
                  padding:"6px 12px", borderRadius:8, border:"1px solid #162440",
                  background:"transparent", color:"#475569", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:6, fontSize:12, fontFamily:"var(--sans)",
                }}>
                  <Icon size={12} color={p.color}/>{p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding:"2rem", maxWidth:1100, margin:"0 auto" }}>
          <PageComponent key={active}/>
        </div>
      </main>
    </div>
  );
}
