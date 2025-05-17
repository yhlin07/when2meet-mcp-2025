import { useState } from "react";
import "./index.css";

function App() {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  
  const handleSubmit = async () => {
    // TODO: Add API call logic here
    console.log("Submitted URL:", linkedinUrl);
  };

  return (
    <div className="container">
      <div className="meeting-card">
        <h1 className="title">Meeting prep</h1>
        <div className="form-container">
          <input
            type="text"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="linkedin url"
            className="input-field"
          />
          <button onClick={handleSubmit} className="submit-button">
            submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;