import React from 'react';

function App() {
  return (
    <div className="App">
      <button onClick={async () => {
        const response = await fetch('http://localhost:8000/');
        const data = await response.json();
        console.log(data.message);
      }}>
        Call API
      </button>
    </div>
  );
}

export default App;
