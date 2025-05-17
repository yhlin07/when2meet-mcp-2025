import { useState } from "react";
import "./index.css";

type Question = { q: string; why: string };
interface Report {
  opener: string;
  questions: Question[];
}

function App() {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteContent, setWebsiteContent] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (loading) return;

    // basic validation: ensure a URL was provided
    if (!linkedinUrl.trim()) {
      setError("Please enter a LinkedIn profile URL.");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);

    try {
      const resp = await fetch("http://localhost:4000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedinUrl,
          websiteContent
        })
      });

      if (!resp.ok) {
        const { error } = await resp.json();
        throw new Error(error || "Request failed");
      }

      const data = await resp.json();
      setReport(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="meeting-card">
        <h1 className="title">Meeting prep</h1>

        <div className="form-container column">
          <input
            className="input-field"
            type="text"
            placeholder="LinkedIn URL"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
          />
          <textarea
            rows={4}
            className="input-field"
            placeholder="Extra website notes (optional)"
            value={websiteContent}
            onChange={(e) => setWebsiteContent(e.target.value)}
          />
          <button
            className="submit-button"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? "Generating…" : "Submit"}
          </button>
        </div>

        {error && (
          <p style={{ marginTop: "1rem", color: "red" }}>{error}</p>
        )}

        {report && (
          <div style={{ marginTop: "2rem" }}>
            <h2>Ice-breaker</h2>
            <p>{report.opener}</p>

            <h2 style={{ marginTop: "1rem" }}>Questions</h2>
            <ul>
              {report.questions.map((q, idx) => (
                <li key={idx} style={{ marginBottom: "0.5rem" }}>
                  <strong>{q.q}</strong>
                  <br />
                  <small>Why: {q.why}</small>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;