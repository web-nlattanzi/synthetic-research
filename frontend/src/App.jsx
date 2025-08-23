import { useState } from "react";

/* ---------- Simple Box wrapper ---------- */
const boxStyle = { border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 12, background: "#fff" };
function Box({ children }) {
  return <div style={boxStyle}>{children}</div>;
}

/* ============================================================================== */
/*                           Synthetic Research Frontend                           */
/* ============================================================================== */
export default function App() {
  /* Tabs */
  const [activeTab, setActiveTab] = useState("audience"); // audience | questions | run

  /* Core inputs */
  const [apiUrl, setApiUrl] = useState("");
  const [researchType, setResearchType] = useState("qual"); // "qual" or "quant"
  const [nRespondents, setNRespondents] = useState(10);

  /* Audience: freeform + builder */
  const [audMode, setAudMode] = useState("freeform"); // "freeform" | "builder"
  const [audienceDescription, setAudienceDescription] = useState("");

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
  const [income, setIncome] = useState("");
  const [behavior, setBehavior] = useState("");
  const [attitudes, setAttitudes] = useState("");

  /* Questions */
  const [questionsText, setQuestionsText] = useState(
    "What motivates you to choose one coffee brand over another?\nDescribe your ideal coffee experience."
  );

  /* Run state */
  const [runId, setRunId] = useState(null);
  const [runStatus, setRunStatus] = useState(null); // queued | running | succeeded | failed | error(...)
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [lastError, setLastError] = useState("");

  /* Helpers */
  const baseUrl = () => apiUrl.replace(/\/$/, "");

  const applyBuilderToDescription = () => {
    const bullets = [];
    if (age.trim()) bullets.push(`• Age: ${age}`);
    if (gender.trim()) bullets.push(`• Gender: ${gender}`);
    if (location.trim()) bullets.push(`• Location: ${location}`);
    if (income.trim()) bullets.push(`• Income: ${income}`);
    if (behavior.trim()) bullets.push(`• Category behavior: ${behavior}`);
    if (attitudes.trim()) bullets.push(`• Attitudes: ${attitudes}`);
    setAudienceDescription(bullets.join("\n"));
  };

  const parseQuestions = () =>
    questionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  /* ---------------------------- Backend Calls ---------------------------- */
  async function createRun() {
    setLastError("");
    const base = baseUrl();
    if (!base) return alert("Please paste your backend API URL (no trailing slash).");
    if (!audienceDescription.trim()) return alert("Please provide an audience description.");
    const qs = parseQuestions();
    if (qs.length === 0) return alert("Please provide at least one question.");
    const n = Number(nRespondents || 1);
    if (isNaN(n) || n < 1) return alert("Respondents must be a positive number.");

    setRunId(null);
    setRunStatus("queued");
    setDownloadUrl(null);

    try {
      const res = await fetch(`${base}/api/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience: audienceDescription,      // <-- matches backend
          research_type: researchType,        // <-- matches backend
          questions: qs,                      // <-- array of strings
          n_respondents: n                    // <-- number
        }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setRunStatus(`error (${res.status})`);
        setLastError(t || "Create run failed.");
        alert(`Create run failed: ${res.status}\n${t || "See backend logs for details."}`);
        return;
      }

      const j = await res.json();
      setRunId(j.run_id);
      setRunStatus("running");
      setActiveTab("run");
      pollStatus(j.run_id);
    } catch (e) {
      setRunStatus("error (network)");
      setLastError(String(e));
      alert("Network error creating run. Check API URL / Port 8000 visibility.");
    }
  }

  function pollStatus(id) {
    const base = baseUrl();
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`${base}/api/runs/${id}`);
        if (!r.ok) {
          if (r.status === 404) {
            setRunStatus("error (not found)");
            clearInterval(timer);
          }
          return;
        }
        const j = await r.json();
        setRunStatus(j.status);
        if (j.status === "succeeded" && j.download_url) {
          setDownloadUrl(`${base}${j.download_url}`);
          clearInterval(timer);
        } else if (j.status === "failed") {
          setLastError(j.message || "Background job failed.");
          clearInterval(timer);
        }
      } catch {
        setRunStatus("error (poll)");
        clearInterval(timer);
      }
    }, 1000);
  }

  /* ---------------------------------- UI --------------------------------- */
  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, Arial, sans-serif",
        minHeight: "100vh",
        background: "#f5f6f7",
        padding: 20,
        color: "#111",
      }}
    >
      {/* horizontally centered container */}
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ textAlign: "center" }}>Synthetic Research Tool</h1>

        {/* Tabs */}
        <div style={{ display: "flex", marginBottom: 20, borderBottom: "2px solid #ddd" }}>
          {["audience", "questions", "run"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "10px",
                border: "none",
                background: activeTab === tab ? "#fff" : "#eee",
                borderBottom: activeTab === tab ? "2px solid #000" : "none",
                cursor: "pointer",
                fontWeight: activeTab === tab ? "bold" : "normal",
              }}
            >
              {tab === "audience" ? "Define Audience" : tab === "questions" ? "Input Questions" : "Run & Export"}
            </button>
          ))}
        </div>

        {/* Define Audience */}
        {activeTab === "audience" && (
          <>
            <Box>
              <h3>API URL</h3>
              <input
                style={{ width: "100%", padding: 8, background: "#fff", color: "#111", border: "1px solid #ccc" }}
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://<hash>-8000.app.github.dev (no trailing slash)"
              />
            </Box>

            <Box>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button
                  onClick={() => setAudMode("freeform")}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    background: audMode === "freeform" ? "#111" : "#fff",
                    color: audMode === "freeform" ? "#fff" : "#111",
                    cursor: "pointer",
                  }}
                >
                  Freeform
                </button>
                <button
                  onClick={() => setAudMode("builder")}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    background: audMode === "builder" ? "#111" : "#fff",
                    color: audMode === "builder" ? "#fff" : "#111",
                    cursor: "pointer",
                  }}
                >
                  Audience Builder
                </button>
              </div>

              {audMode === "freeform" ? (
                <textarea
                  style={{ width: "100%", minHeight: 160, padding: 8, background: "#fff", color: "#111", border: "1px solid #ccc" }}
                  value={audienceDescription}
                  onChange={(e) => setAudienceDescription(e.target.value)}
                  placeholder="Describe your audience… (bullets work great)"
                />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <h3>Builder</h3>
                    <input placeholder="Age" style={{ width: "100%", padding: 8, marginBottom: 8 }} value={age} onChange={(e) => setAge(e.target.value)} />
                    <input placeholder="Gender" style={{ width: "100%", padding: 8, marginBottom: 8 }} value={gender} onChange={(e) => setGender(e.target.value)} />
                    <input placeholder="Location" style={{ width: "100%", padding: 8, marginBottom: 8 }} value={location} onChange={(e) => setLocation(e.target.value)} />
                    <input placeholder="Income" style={{ width: "100%", padding: 8, marginBottom: 8 }} value={income} onChange={(e) => setIncome(e.target.value)} />
                    <input placeholder="Category behavior" style={{ width: "100%", padding: 8, marginBottom: 8 }} value={behavior} onChange={(e) => setBehavior(e.target.value)} />
                    <input placeholder="Attitudes" style={{ width: "100%", padding: 8, marginBottom: 8 }} value={attitudes} onChange={(e) => setAttitudes(e.target.value)} />
                    <button onClick={applyBuilderToDescription}>Apply to Audience Description</button>
                  </div>
                  <div>
                    <h3>Preview</h3>
                    <textarea
                      style={{ width: "100%", minHeight: 160, padding: 8, background: "#fff", color: "#111", border: "1px solid #ccc" }}
                      value={audienceDescription}
                      onChange={(e) => setAudienceDescription(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </Box>

            <Box>
              <h3>Research Settings</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label><strong>Research Type</strong></label>
                  <select
                    style={{ width: "100%", padding: 8, background: "#fff", color: "#111", border: "1px solid #ccc" }}
                    value={researchType}
                    onChange={(e) => setResearchType(e.target.value)}
                  >
                    <option value="qual">Qual (verbatims + themes)</option>
                    <option value="quant">Quant (Excel + summary)</option>
                  </select>
                </div>
                <div>
                  <label><strong>Number of Respondents</strong></label>
                  <input
                    type="number"
                    min={1}
                    style={{ width: "100%", padding: 8, background: "#fff", color: "#111", border: "1px solid #ccc" }}
                    value={nRespondents}
                    onChange={(e) => setNRespondents(Math.max(1, Number(e.target.value || 1)))}
                  />
                </div>
              </div>
            </Box>
          </>
        )}

        {/* Input Questions */}
        {activeTab === "questions" && (
          <Box>
            <h3>Input Questions</h3>
            <textarea
              style={{ width: "100%", minHeight: 200, padding: 8, background: "#fff", color: "#111", border: "1px solid #ccc" }}
              value={questionsText}
              onChange={(e) => setQuestionsText(e.target.value)}
              placeholder={
                researchType === "qual"
                  ? "Enter one open-ended question per line…"
                  : "Paste survey logic or enter one question per line…"
              }
            />
          </Box>
        )}

        {/* Run & Export */}
        {activeTab === "run" && (
          <>
            <Box>
              <h3>Preview</h3>
              <p><strong>Audience</strong></p>
              <pre style={{ background: "#f4f4f4", padding: 10, whiteSpace: "pre-wrap" }}>
                {audienceDescription || "(none)"}
              </pre>
              <p><strong>Questions</strong></p>
              <pre style={{ background: "#f4f4f4", padding: 10, whiteSpace: "pre-wrap" }}>
                {questionsText || "(none)"}
              </pre>
              <p><strong>Research Type:</strong> {researchType}</p>
              <p><strong>Respondents:</strong> {nRespondents}</p>
              <p><strong>Status:</strong> {runStatus || "(idle)"} {runId ? `(run_id: ${runId})` : ""}</p>
              {lastError && <p style={{ color: "#b00020" }}><strong>Error:</strong> {lastError}</p>}
            </Box>

            <Box>
              <button style={{ padding: "10px 20px", marginRight: 10 }} onClick={createRun}>
                {runStatus ? `Generate (status: ${runStatus})` : "Generate"}
              </button>
              <button
                style={{ padding: "10px 20px", opacity: downloadUrl ? 1 : 0.6, cursor: downloadUrl ? "pointer" : "not-allowed" }}
                disabled={!downloadUrl}
                onClick={() => (window.location.href = downloadUrl)}
                title={downloadUrl ? "Download Excel" : "Not ready yet"}
              >
                {downloadUrl ? "Download Results" : "Download Results (not ready)"}
              </button>
            </Box>
          </>
        )}
      </div>
    </div>
  );
}