import { useState, useRef } from "react";
import { CheckCircle2, AlertCircle, Upload } from "lucide-react";

// ── Card ─────────────────────────────────────────────────────────────────────
export const Card = ({ children, style = {}, accent }) => (
  <div style={{
    background: "linear-gradient(135deg,#0d1a30,#101f38)",
    border: `1.5px solid ${accent ? accent + "40" : "#162440"}`,
    borderRadius: 12,
    padding: "1.4rem",
    ...style,
  }}>{children}</div>
);

// ── Label ────────────────────────────────────────────────────────────────────
export const Label = ({ children, color = "#94a3b8" }) => (
  <div style={{ color, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
    {children}
  </div>
);

// ── Input ────────────────────────────────────────────────────────────────────
export const Input = ({ value, onChange, placeholder, style = {} }) => {
  const [focus, setFocus] = useState(false);
  return (
    <input
      value={value} onChange={onChange} placeholder={placeholder}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        width: "100%", padding: "10px 14px",
        background: "#080f1c", border: `1.5px solid ${focus ? "#06b6d4" : "#162440"}`,
        borderRadius: 10, color: "#e2e8f0", fontFamily: "var(--sans)", fontSize: 14,
        outline: "none", transition: "border-color 0.2s", ...style,
      }}
    />
  );
};

// ── Btn ──────────────────────────────────────────────────────────────────────
export const Btn = ({ children, onClick, disabled, color = "#06b6d4", style = {} }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: "12px 24px", borderRadius: 10, border: `1.5px solid ${color}50`,
    background: disabled ? "#0d1a30" : `linear-gradient(135deg,${color}22,${color}11)`,
    color: disabled ? "#475569" : color,
    fontFamily: "var(--sans)", fontWeight: 700, fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    transition: "all 0.2s", width: "100%",
    boxShadow: disabled ? "none" : `0 4px 20px ${color}15`,
    ...style,
  }}>{children}</button>
);

// ── Spinner ──────────────────────────────────────────────────────────────────
export const Spinner = ({ color = "#06b6d4", size = 20 }) => (
  <div style={{
    width: size, height: size,
    border: `2.5px solid ${color}30`, borderTopColor: color,
    borderRadius: "50%", animation: "spin 0.65s linear infinite", display: "inline-block", flexShrink: 0,
  }} />
);

// ── Tag ──────────────────────────────────────────────────────────────────────
export const Tag = ({ children, color = "#06b6d4" }) => (
  <span style={{
    display: "inline-block", padding: "3px 12px", borderRadius: 99,
    background: `${color}15`, border: `1px solid ${color}35`,
    color, fontSize: 11, fontWeight: 600, margin: "3px",
    fontFamily: "var(--mono)",
  }}>{children}</span>
);

// ── ScoreBar ─────────────────────────────────────────────────────────────────
export const ScoreBar = ({ label, score, color, icon }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
      <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>{icon} {label}</span>
      <span style={{ color, fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13 }}>{score}/10</span>
    </div>
    <div style={{ height: 6, background: "#162440", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${score * 10}%`, background: color, borderRadius: 99, transition: "width 0.8s ease" }} />
    </div>
  </div>
);

// ── GradeBadge ───────────────────────────────────────────────────────────────
const GRADE_COLORS = { A:"#10b981","B+":"#06b6d4",B:"#8b5cf6","C+":"#f59e0b",C:"#f97316",D:"#ef4444" };
export const GradeBadge = ({ grade }) => {
  const color = GRADE_COLORS[grade] || "#94a3b8";
  return (
    <div style={{
      width: 72, height: 72, borderRadius: 16,
      background: `${color}18`, border: `2px solid ${color}50`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color, fontWeight: 900, fontSize: 28, fontFamily: "var(--mono)",
    }}>{grade}</div>
  );
};

// ── DropZone ─────────────────────────────────────────────────────────────────
export const DropZone = ({ accept, label, hint, onFile, file, color = "#06b6d4" }) => {
  const [hover, setHover] = useState(false);
  const ref = useRef();
  const handle = (e) => {
    e.preventDefault(); setHover(false);
    const f = e.dataTransfer?.files[0] || e.target.files[0];
    if (f) onFile(f);
  };
  return (
    <div
      onClick={() => ref.current.click()}
      onDragOver={e => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={handle}
      style={{
        border: `2px dashed ${hover ? color : file ? "#10b981" : "#162440"}`,
        borderRadius: 12, padding: "1.8rem 1.2rem", textAlign: "center", cursor: "pointer",
        background: hover ? `${color}08` : file ? "#10b98108" : "#080f1c",
        transition: "all 0.2s",
      }}
    >
      <input ref={ref} type="file" accept={accept} onChange={handle} style={{ display: "none" }} />
      {file ? (
        <>
          <CheckCircle2 size={28} color="#10b981" style={{ marginBottom: 8 }} />
          <div style={{ color: "#10b981", fontWeight: 700, fontSize: 14 }}>{file.name}</div>
          <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{(file.size/1024).toFixed(1)} KB · click to change</div>
        </>
      ) : (
        <>
          <Upload size={26} color="#334155" style={{ marginBottom: 8 }} />
          <div style={{ color: "#64748b", fontWeight: 600, fontSize: 14 }}>{label}</div>
          <div style={{ color: "#334155", fontSize: 11, marginTop: 5 }}>{hint}</div>
        </>
      )}
    </div>
  );
};

// ── ErrorMsg ─────────────────────────────────────────────────────────────────
export const ErrorMsg = ({ msg }) => msg ? (
  <div style={{ color: "#ef4444", fontSize: 13, display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", background: "#ef444410", borderRadius: 8, border: "1px solid #ef444430" }}>
    <AlertCircle size={14} /> {msg}
  </div>
) : null;

// ── SectionTitle ─────────────────────────────────────────────────────────────
export const SectionTitle = ({ children, color = "#06b6d4" }) => (
  <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15, borderLeft: `3px solid ${color}`, paddingLeft: 10, marginBottom: 14 }}>
    {children}
  </div>
);

// ── FeedbackCard ─────────────────────────────────────────────────────────────
export const FeedbackCard = ({ label, text, color }) => (
  <div style={{
    borderLeft: `3px solid ${color}`, borderRadius: "0 10px 10px 0",
    background: "#0b1526", padding: "1rem 1.2rem",
  }}>
    <div style={{ color, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
    <div style={{ color: "#94a3b8", lineHeight: 1.7, fontSize: 13 }}>{text || "N/A"}</div>
  </div>
);
