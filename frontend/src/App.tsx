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
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (loading) return;

    if (!linkedinUrl.trim()) {
      setError("Please enter a LinkedIn profile URL.");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);
    setStreamText("");

    const qs = new URLSearchParams({
      linkedinUrl,
      websiteContent,
    });

    const es = new EventSource(
      `http://localhost:4000/api/report/stream?${qs.toString()}`
    );

    es.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.text) {
        setStreamText((t) => t + data.text);
      }
      if (data.done) {
        setReport(data.report);
        setLoading(false);
        es.close();
      }
    };

    es.onerror = () => {
      setError("Stream error");
      setLoading(false);
      es.close();
    };
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

        {loading && streamText && (
          <pre style={{ marginTop: "1rem" }}>{streamText}</pre>
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