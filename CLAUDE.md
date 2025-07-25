# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (runs with Turbopack for faster builds)
- **Build production**: `npm run build`
- **Start production server**: `npm start`
- **Lint code**: `npm run lint`

## Code Style Preferences

- **File naming**: Use kebab-case for all file names (e.g., `meeting-form.tsx`, `report-view.tsx`)
- **Import paths**: Always use "@/" alias instead of relative imports (e.g., `"@/app/components/meeting-form"` not `"./meeting-form"`)

## Project Architecture

This is a Next.js 15 application that creates meeting preparation dossiers by researching LinkedIn profiles and company information using AI and web search capabilities.

### Core Architecture

The application follows a tool-based orchestrator architecture with streaming support using Vercel AI SDK:

1. **Frontend** (`src/app/components/`): React components using server-side streaming

   - `meeting-form.tsx`: Main form for LinkedIn URL and website notes input
   - `report-view.tsx`: Displays generated meeting dossier with ice-breakers and questions
   - Uses EventSource for real-time streaming of AI responses

2. **API Layer** (`src/app/api/report/`):

   - `route.ts`: Edge runtime endpoint with tool-based orchestration
   - Server-Sent Events (SSE) streaming with keep-alive heartbeats
   - Input validation using Zod schemas
   - 300-second timeout for complex research tasks

3. **Tool-Based AI Integration** (`src/app/tools/`):
   - `perplexity-search.ts`: Wraps Perplexity API as a Vercel AI SDK tool
   - `openai-summary.ts`: Generates structured dossiers using OpenAI with Zod validation
   - OpenAI GPT-4o-mini orchestrates tool usage workflow
   - Streams responses in real-time for better user experience
   - Built-in error handling and structured output validation

### Key Dependencies

- **ai**: Vercel AI SDK core for streaming text generation and tool orchestration
- **@ai-sdk/openai**: OpenAI provider for orchestration
- **openai**: OpenAI client for summary generation tool
- **zod**: Runtime type validation and structured output schemas
- **Tailwind CSS**: Styling with retro brutalist design

### Environment Variables Required

- `PERPLEXITY_API_KEY`: Perplexity API access for web research tool
- `OPENAI_API_KEY`: OpenAI API access for orchestration and summary generation

### Data Flow

1. User submits LinkedIn URL + optional website notes
2. Frontend streams request to `/api/report`
3. Edge runtime orchestrator coordinates two-step workflow:
   - **Research Phase**: Uses `perplexity_search` tool with `sonar-medium-online` model
   - **Summary Phase**: Uses `openai_summary` tool with GPT-4o-mini to generate structured dossier
   - Streams tokens in real-time via SSE throughout both phases
   - Maintains keep-alive heartbeat every 25s to prevent timeouts
4. Final structured dossier captured from tool result and streamed to frontend
5. UI displays ice-breaker and contextual questions

### Response Format

The system generates structured meeting dossiers:

```typescript
interface DossierResponse {
  status: 'complete'
  opener: string // Two-sentence personalized ice-breaker
  questions: Array<{
    q: string // Open-ended question
    why: string // One-sentence rationale
  }>
}
```
