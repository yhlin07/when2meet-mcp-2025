# Frontend

This React application provides the user interface for the meeting‑prep tool. Users submit a LinkedIn profile and optional website notes; the app then calls the backend to generate a short dossier.

## Requirements

- Node.js 18 or newer

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000).

The frontend expects the backend to run on `http://localhost:4000`. If your backend is hosted elsewhere, update the API URL used in `src/App.tsx`.
The app now uses Server-Sent Events to stream progress while the dossier is being generated.

## Scripts

- `npm test` – run the React test suite.
- `npm run build` – create an optimized production build in the `build` folder.
- `npm run eject` – expose the underlying configuration (this is irreversible).
