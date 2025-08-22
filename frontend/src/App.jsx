import { useState } from "react";
import * as XLSX from "xlsx"; // npm i xlsx

/* ---------- Stable Box (prevents focus loss) ---------- */
const boxStyle = { border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 12 };
function Box({ children }) { return <div style={boxStyle}>{children}</div>; }

export default function App() {
  // Tabs: Define Audience | Input Questions | Run & Export
  const [tab, setTab] = useState("define");

  // App config
  const [apiUrl, setApiUrl] = useState((import.meta.env.VITE_API_URL || "").replace(/\/$/, ""));
  const [researchType, setResearchType] = useState("qual"); // "qual" | "quant"
  const [nRespondents, setNRespondents] = useState(25);

  // Audience
  const [defineMode, setDefineMode] = useState("freeform"); // "freeform" | "template"
  const [segment, setSegment] = useState("");

  // Template builder fields
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
  const [income, setIncome] = useState("");
  const [behavior, setBehavior] = useState("");
  const [attitudes, setAttitudes] = useState("");
  const [templates, setTemplates] = useState([]); // {name, data:{...}}
  const [newTemplateName, setNewTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Questions
  const [questionsText, setQuestionsText] = useState(
    "Q1_appeal: Overall appeal? (Low/Med/High)\nQopen_react: React in 2-4 sentences; include 1 example. [open]"
  );

  // Run state
  const [runStatus, setRunStatus] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [runId, setRunId] = useState(null);

  /* ---------------- Audience helpers (Template Builder) ---------------- */
  const buildAudience = (d) => {
    const out = [];
    if (d.age?.trim()) out.push(`• Age: ${d.age}`);
    if (d.gender?.trim()) out.push(`• Gender: ${d.gender}`);
    if (d.location?.trim()) out.push(`• Location: ${d.location}`);
    if (d.income?.trim()) out.push(`• Income: ${d.income}`);
    if (d.behavior?.trim()) out.push(`• Category Behavior: ${d.behavior}`);
    if (d.attitudes?.trim()) out.push(`• Attitudes: ${d.attitudes}`);
    return out.join("\n");
  };

  const applyCurrentInputs = () =>
    setSegment(buildAudience({ age, gender, location, income, behavior, attitudes }));

  const saveTemplate = () => {
    if (!newTemplateName.trim()) return;
    const payload = { name: newTemplateName.trim(), data: { age, gender, location, income, behavior, attitudes } };
    const exists = templates.some(t => t.name.toLowerCase() === payload.name.toLowerCase());
    setTemplates(prev =>
      exists
        ? prev.map(t => (t.name.toLowerCase() === payload.name.toLowerCase() ? payload : t))
        : [...prev, payload]
    );
    setSelectedTemplate(payload.name);
  };

  const loadSelectedTemplate = () => {
    const tpl = templates.find(t => t.name === selectedTemplate);
    if (!tpl) return;
    setAge(tpl.data.age || ""); setGender(tpl.data.gender || ""); setLocation(tpl.data.location || "");
    setIncome(tpl.data.income || ""); setBehavior(tpl.data.behavior || ""); setAttitudes(tpl.data.attitudes || "");
    setSegment(buildAudience(tpl.data));
  };

  const deleteTemplate = () => {
    if (!selectedTemplate) return;
    setTemplates(prev => prev.filter(t => t.name !== selectedTemplate));
    setSelectedTemplate("");
  };

  /* -------------------------- File upload helpers -------------------------- */
  function appendQuestions(newLines) {
    const current = questionsText ? questionsText.trim() + "\n" : "";
    setQuestionsText(current + newLines.join("\n"));
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.toLowerCase().split(".").pop();

    if (ext === "txt" || ext === "csv") {
      const text = await file.text();
      appendQuestions(text.split(/\r?\n/).map(l => l.trim()).filter(Boolean));
      return;
    }

    if (ext === "xlsx" || ext === "xls") {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }); // array of arrays

      // Expect columns like: id | prompt | options | type (best-effort)
      const lines = [];
      for (let i = 1; i < rows.length; i++) {
        const [idRaw, promptRaw, optionsRaw, typeRaw] = rows[i];
        const id = String(idRaw || "").trim();
        const prompt = String(promptRaw || "").trim();
        const type = String(typeRaw || "").trim().toLowerCase();
        const opts = String(optionsRaw || "").trim();
        if (!id && !prompt) continue;

        if (type === "open" || /\[open\]/i.test(prompt) || /open/i.test(id)) {
          lines.push(`${id || `Q${i}`}: ${prompt} [open]`);
        } else if (opts) {
          const paren = `(${opts.split(/[|/,;]/).map(s => s.trim()).filter(Boolean).join("/")})`;
          lines.push(`${id || `Q${i}`}: ${prompt} ${paren}`);
        } else {
          lines.push(`${id || `Q${i}`}: ${prompt}`);
        }
      }
      appendQuestions(lines);
      return;
    }

    alert("Supported uploads: .txt, .csv, .xlsx");
  }

  /* -------------------------- Parsing for backend -------------------------- */
  // Qual: each line = open-end.
  // Quant: parse options in ( ), allow [multi] for multi-select, keep logic notes in prompt text.
  function parseQuestions() {
    const lines = questionsText.split("\n").map(l => l.trim()).filter(Boolean);
    if (researchType === "qual") {
      return lines.map((line, idx) => ({
        q: line.split(":")[0]?.trim() || `Qopen_${idx + 1}`,
        type: "open",
        prompt: line
      }));
    }
    // quant
    return lines.map(line => {
      const id = line.split(":")[0]?.trim() || "Q";
      const isOpen = /\[open\]/i.test(line);
      if (isOpen) return { q: id, type: "open", prompt: line };
      const multi = /\[multi\]/i.test(line);
      const m = line.match(/\(([^)]+)\)/);
      const opts = m ? m[1].split(/[\/,|]/).map(s => s.trim()).filter(Boolean) : ["Yes", "No"];
      return { q: id, type: multi ? "multi" : "single", options: opts, prompt: line };
    });
  }

  /* ------------------------------ Backend calls ---------------------------- */
  async function createRun() {
    if (!apiUrl) { alert("Paste your backend API URL (port 8000, no trailing slash)."); return; }
    setRunStatus("queued"); setDownloadUrl(null); setRunId(null);

    const body = {
      research_type: researchType,
      segment_text: segment,
      questions: parseQuestions(),
      n_respondents: Number(nRespondents || 25),
    };

    let res;
    try {
      res = await fetch(`${apiUrl}/api/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setRunStatus("error (network)");
      alert("Network error creating run. Check API URL and that port 8000 is Public.");
      return;
    }

    if (!res.ok) {
      const text = await res.text();
      setRunStatus(`error (${res.status})`);
      alert(`Create run failed: ${res.status}\n${text}`);
      return;
    }

    const j = await res.json();
    if (!j.run_id) { setRunStatus("error (no run_id)"); alert("Create run failed: no run_id returned."); return; }
    setRunId(j.run_id);
    poll(j.run_id);
  }

  function poll(id) {
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`${apiUrl}/api/runs/${id}`);
        if (!r.ok) { if (r.status === 404) { setRunStatus("error (not found)"); clearInterval(timer); } return; }
        const j = await r.json();
        setRunStatus(j.status);
        if (j.status === "succeeded" && j.download_url) {
          clearInterval(timer);
          setDownloadUrl(`${apiUrl}${j.download_url}`);
        }
        if (j.status === "failed") clearInterval(timer);
      } catch {
        setRunStatus("error (network)"); clearInterval(timer);
      }
    }, 1000);
  }

  /* ------------------------------------ UI --------------------------------- */
  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #ddd",
        background: tab === id ? "#111" : "#fff",
        color: tab === id ? "#fff" : "#111",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  const inputStyle = { padding: 8, background: "#fff", color: "#111", border: "1px solid #ccc" };
  const textareaLight = { width: "100%", minHeight: 120, padding: 8, background: "#fff", color: "#111", border: "1px solid #ccc" };
  const preStyle = { background: "#f6f6f6", padding: 12, borderRadius: 8, overflow: "auto", color: "#111" };

  return (
    <div style={{ maxWidth: 1100, margin: "32px auto", fontFamily: "Inter, system-ui, Arial, sans-serif", color: "#111" }}>
      <h1>Synthetic Research Tool</h1>
      <p style={{ color: "#555" }}>Define an audience, input questions, generate synthetic responses, download Excel.</p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <TabBtn id="define" label="1. Define Audience" />
        <TabBtn id="questions" label="2. Input Questions" />
        <TabBtn id="run" label="3. Run & Export" />
      </div>

      {/* Define Audience */}
      {tab === "define" && (
        <Box>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => setDefineMode("freeform")}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd",
                background: defineMode === "freeform" ? "#111" : "#fff", color: defineMode === "freeform" ? "#fff" : "#111" }}>
              Freeform
            </button>
            <button
              onClick={() => setDefineMode("template")}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd",
                background: defineMode === "template" ? "#111" : "#fff", color: defineMode === "template" ? "#fff" : "#111" }}>
              Template Builder
            </button>
          </div>

          {defineMode === "freeform" ? (
            <>
              <label><strong>Audience Description</strong></label>
              <textarea
                rows={12}
                style={textareaLight}
                placeholder={
                  "Be specific. Bullets are great.\n" +
                  "• Age: 25-44\n" +
                  "• Location: US\n" +
                  "• Category behavior: Drinks vodka monthly\n" +
                  "• Attitudes: Values ambition; enjoys recognition"
                }
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
              />
            </>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <h3>Template Builder</h3>
                <label>Age</label><input style={inputStyle} value={age} onChange={e=>setAge(e.target.value)} placeholder="e.g., 25-44" />
                <label>Gender</label><input style={inputStyle} value={gender} onChange={e=>setGender(e.target.value)} placeholder="e.g., Mix of male and female" />
                <label>Location</label><input style={inputStyle} value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g., US urban/suburban" />
                <label>Income</label><input style={inputStyle} value={income} onChange={e=>setIncome(e.target.value)} placeholder="e.g., $50k-$100k HH income" />
                <label>Category Behavior</label><input style={inputStyle} value={behavior} onChange={e=>setBehavior(e.target.value)} placeholder="e.g., Drinks vodka monthly" />
                <label>Attitudes</label><input style={inputStyle} value={attitudes} onChange={e=>setAttitudes(e.target.value)} placeholder="e.g., Values ambition; enjoys recognition" />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                  {templates.length > 0 ? (
                    <select style={inputStyle} value={selectedTemplate} onChange={e=>setSelectedTemplate(e.target.value)}>
                      <option value="">Select a saved template</option>
                      {templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                    </select>
                  ) : <div style={{ padding: "8px 0", color: "#666" }}>No saved templates yet</div>}
                  <button onClick={loadSelectedTemplate} disabled={!selectedTemplate}>Load Saved Template</button>
                  <button onClick={applyCurrentInputs}>Apply Current Inputs</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                  <input style={inputStyle} placeholder="Save as… (template name)" value={newTemplateName} onChange={e=>setNewTemplateName(e.target.value)} />
                  <button onClick={saveTemplate}>Save Template</button>
                  <button onClick={deleteTemplate} disabled={!selectedTemplate} style={{ color: "#b00020" }}>Delete Template</button>
                </div>
              </div>

              <div>
                <h3>Audience Description Preview</h3>
                <textarea rows={12} style={textareaLight} value={segment} onChange={e=>setSegment(e.target.value)} />
                <small style={{ color: "#666" }}>Edits here update the Freeform text directly.</small>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
            <select style={inputStyle} value={researchType} onChange={(e) => setResearchType(e.target.value)}>
              <option value="quant">Quantitative</option>
              <option value="qual">Qualitative</option>
            </select>
            <input style={inputStyle} type="number" min={1} value={nRespondents} onChange={e => setNRespondents(Number(e.target.value))} placeholder="Respondents" />
            <input style={inputStyle} value={apiUrl} onChange={e => setApiUrl(e.target.value.replace(/\/$/, ""))} placeholder="https://8000-...github.dev (no trailing /)" />
          </div>
        </Box>
      )}

      {/* Input Questions */}
      {tab === "questions" && (
        <Box>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label><strong>Input Questions</strong></label>
            <input type="file" accept=".txt,.csv,.xlsx,.xls" onChange={handleFile} />
          </div>
          <textarea
            rows={12}
            style={{ width: "100%", marginTop: 8, ...textareaLight }}
            value={questionsText}
            onChange={(e) => setQuestionsText(e.target.value)}
            placeholder={
              researchType === "qual"
                ? "One open-ended question per line."
                : "Q1: Prompt (Option1/Option2/Option3)\nQ2: Prompt (Yes/No) [multi]\nIF Q1=Yes -> Ask Q2 (logic notes are okay)"
            }
          />
          <small style={{ color: "#666" }}>
            {researchType === "qual"
              ? "All lines are treated as open ends."
              : "Options in ( ); add [multi] for multi-select. Logic notes are preserved in prompt text."}
          </small>
        </Box>
      )}

      {/* Run & Export */}
      {tab === "run" && (
        <Box>
          <p><strong>Audience</strong></p>
          <pre style={preStyle}>{segment || "(none)"}</pre>
          <p><strong>Questions</strong></p>
          <pre style={preStyle}>{questionsText || "(none)"}</pre>
          <p><strong>Respondents:</strong> {nRespondents} &nbsp;|&nbsp; <strong>Type:</strong> {researchType}</p>

          <button onClick={createRun} style={{ width: "100%", padding: "10px", marginTop: 8 }}>
            {runStatus ? `Generate (status: ${runStatus})` : "Generate Synthetic Responses"}
          </button>
          <button
            disabled={!downloadUrl}
            onClick={() => (window.location.href = downloadUrl)}
            style={{ width: "100%", padding: "10px", marginTop: 8 }}
          >
            {downloadUrl ? "Download Excel" : "Download Excel (not ready)"}
          </button>
          {runId && <div style={{ marginTop: 8, color: "#666" }}>Run ID: {runId}</div>}
        </Box>
      )}
    </div>
  );
}
