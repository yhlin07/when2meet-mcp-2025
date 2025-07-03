# Backend

This directory contains the Express server that powers the meeting-prep workflow. It exposes a single REST endpoint used by the React front‑end to generate a dossier for a LinkedIn contact.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file and provide the following environment variables:
   - `ANTHROPIC_API_KEY` – API key for Anthropic Claude.
   - `PERPLEXITY_API_KEY` – API key for Perplexity Ask.
   - `PORT` – (optional) port to listen on, default `4000`.
   - `CORS_ORIGIN` – (optional) allowed origin for CORS, default `*`.
   - `ANTHROPIC_MODEL` – (optional) Claude model ID to use.

## Running the server

Start the server with:
```bash
npm start
```

For automatic reloads during development use:
```bash
npm run dev
```

The server will log `⚡️  Backend ready on :4000` once it is running (or the port you configured).

## API

### `POST /api/report`

Request body:
```json
{
  "linkedinUrl": "https://www.linkedin.com/in/example",
  "websiteContent": "Optional extra notes from the person's site"
}
```

On success the response looks like:
```json
{
  "status": "complete",
  "opener": "Ice‑breaker text",
  "questions": [
    { "q": "Question text", "why": "Reason" }
  ]
}
```

If a timeout occurs or the input is invalid you will receive an error JSON with an appropriate HTTP status code.
