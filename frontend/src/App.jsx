import { useState } from "react";

// Reusable Box component
const boxStyle = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginTop: 12,
  background: "#fff",
};
function Box({ children }) {
  return <div style={boxStyle}>{children}</div>;
}

export default function App() {
  // Tabs
  const [activeTab, setActiveTab] = useState("audience"); // audience | questions | run

  // Core state
  const [apiUrl, setApiUrl] = useState("");
  const [researchType, setResearchType] = useState("quant"); // quant | qual
  const [nRespondents, setNRespondents] = useState(25);
  const [audienceDescription, setAudienceDescription] = useState("");
  const [questions, setQuestions] = useState("");

  const [runId, setRunId] = useState(null);
  const [status, setStatus] = useState(null);

  // Audience Builder
  const [audMode, setAudMode] = useState("freeform");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
  const [income, setIncome] = useState("");
  const [behavior, setBehavior] = useState("");
  const [attitudes, setAttitudes] = useState("");

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

  const handleSubmit = async () => {
    const base = apiUrl.replace(/\/$/, "");
    if (!base) {
      alert("Please set the API URL first.");
      return;
    }
    if (!audienceDescription.trim()) {
      alert("Please add an audience description.");
      return;
    }
    if (!questions.trim()) {
      alert("Please add at least one question.");
      return;
    }

    try {
      setStatus("running");
      const response = await fetch(`${base}/api/runs/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience: audienceDescription,
          questions: questions.split("\n").map((s) => s.trim()).filter(Boolean),
          research_type: researchType,
          n_respondents: Number(nRespondents || 25),
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        setStatus(`error (${response.status})`);
        alert(`Create run failed: ${response.status}\n${errText || "See backend logs."}`);
        return;
      }

      const data = await response.json();
      setRunId(data.run_id);
      setStatus("succeeded");
    } catch (err) {
      setStatus("error");
      alert("Request failed: " + err.message);
    }
  };

  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, Arial, sans-serif",
        minHeight: "100vh",
        backgroundColor: "#f5f6f7",
        padding: 20,
        color: "#111",
      }}
    >
      {/* Centered content */}
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

        {/* --- Define Audience --- */}
        {activeTab === "audience" && (
          <>
            <Box>
              <h3>API URL</h3>
              <input
                style={{ width: "100%", padding: 8, background: "#fff", color: "#111", border: "1px solid #ccc" }}
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://xxxx-8000.app.github.dev (no trailing slash)"
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
                  placeholder="Describe your audience..."
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
                    <textarea style={{ width: "100%", minHeight: 160, padding: 8 }} value={audienceDescription} onChange={(e) => setAudienceDescription(e.target.value)} />
                  </div>
                </div>
              )}
            </Box>

            <Box>
              <h3>Research Settings</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ textAlign: "left" }}>
                  <label><strong>Research Type</strong></label>
                  <select
                    style={{ width: "100%", padding: 8, background: "#fff", color: "#111", border: "1px solid #ccc" }}
                    value={researchType}
                    onChange={(e) => setResearchType(e.target.value)}
                  >
                    <option value="quant">Quant (Excel + summary)</option>
                    <option value="qual">Qual (verbatims + themes)</option>
                  </select>
                </div>
                <div style={{ textAlign: "left" }}>
                  <label><strong>Number of Respondents</strong></label>
                  <input
                    type="number"
                    min={1}
                    style={{ width: "100%", padding: 8, background: "#fff", color: "#111", border: "1px solid #ccc" }}
                    value={nRespondents}
                    onChange={(e) => setNRespondents(Math.max(1, Number(e.target.value || 1)))}
                    placeholder="e.g., 25"
                  />
                </div>
              </div>
            </Box>
          </>
        )}

        {/* --- Input Questions --- */}
        {activeTab === "questions" && (
          <Box>
            <h3>Input Questions</h3>
            <textarea
              style={{ width: "100%", minHeight: 200, padding: 8, background: "#fff", color: "#111", border: "1px solid #ccc" }}
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              placeholder={
                researchType === "qual"
                  ? "Enter one open-ended question per line..."
                  : "Paste survey logic or enter one question per line."
              }
            />
          </Box>
        )}

        {/* --- Run & Export --- */}
        {activeTab === "run" && (
          <>
            <Box>
              <h3>Preview</h3>
              <p><strong>Audience</strong></p>
              <pre style={{ background: "#f4f4f4", padding: 10 }}>{audienceDescription || "(none)"}</pre>
              <p><strong>Questions</strong></p>
              <pre style={{ background: "#f4f4f4", padding: 10 }}>{questions || "(none)"}</pre>
              <p><strong>Research Type:</strong> {researchType}</p>
              <p><strong>Respondents:</strong> {nRespondents}</p>
            </Box>

            <Box>
              <button style={{ padding: "10px 20px", marginRight: 10 }} onClick={handleSubmit}>
                Generate {status && `(status: ${status})`}
              </button>
              {runId && status === "succeeded" && (
                <a href={`${apiUrl.replace(/\/$/, "")}/api/runs/${runId}/download`} target="_blank" rel="noreferrer">
                  <button style={{ padding: "10px 20px" }}>Download Results</button>
                </a>
              )}
            </Box>
          </>
        )}
      </div>
    </div>
  );
}
