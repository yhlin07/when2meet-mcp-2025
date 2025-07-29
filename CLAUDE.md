# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (runs with Turbopack for faster builds)
- **Build production**: `npm run build`
- **Start production server**: `npm start`
- **Lint code**: `npm run lint`
- **Format code**: `npm run format` (Prettier)
- **Check formatting**: `npm run format:check`

## Code Style Preferences

- **File naming**: Use kebab-case for all file names (e.g., `meeting-form.tsx`, `report-view.tsx`)
- **Import paths**: Always use "@/" alias instead of relative imports (e.g., `"@/app/components/meeting-form"` not `"./meeting-form"`)
- **TypeScript**: Strict typing with interfaces and Zod schemas for runtime validation
- **Component structure**: Client components only when necessary (for hooks and interactivity)

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
   - OpenAI GPT-4.1 orchestrates tool usage workflow
   - Streams responses in real-time for better user experience
   - Built-in error handling and structured output validation

4. **Hooks** (`src/app/hooks/`):
   - `use-report-generation.ts`: Custom hook managing form state and SSE streaming

### Key Dependencies

- **ai**: Vercel AI SDK core (v4.3.19) for streaming text generation and tool orchestration
- **@ai-sdk/openai**: OpenAI provider (v1.3.23) for orchestration
- **@ai-sdk/perplexity**: Perplexity provider (v1.1.9) for web research
- **zod**: Runtime type validation (v3.25.76) and structured output schemas
- **Tailwind CSS v4**: Next-generation styling with custom brutalist design
- **Next.js 15.4.4**: Latest App Router with Edge Runtime support
- **React 19**: Latest React with improved streaming capabilities

### Environment Variables Required

- `PERPLEXITY_API_KEY`: Perplexity API access for web research tool
- `OPENAI_API_KEY`: OpenAI API access for orchestration and summary generation

### Data Flow

1. User submits LinkedIn URL + optional website notes
2. Frontend streams request to `/api/report`
3. Edge runtime orchestrator coordinates two-step workflow:
   - **Research Phase**: Uses `perplexity_search` tool with `sonar` model for web research
   - **Summary Phase**: Uses `openai_summary` tool with GPT-4.1 to generate structured dossier
   - Streams tokens in real-time via SSE throughout both phases
   - Maintains keep-alive heartbeat every 25s to prevent timeouts
   - Handles errors gracefully with structured error responses
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
  }> // Exactly 3 questions
}
```

## Best Practices

1. **Error Handling**: Always wrap async operations in try-catch blocks
2. **Streaming**: Use SSE for real-time updates during long-running operations
3. **Validation**: Use Zod schemas for all external data (API inputs/outputs)
4. **Type Safety**: Leverage TypeScript's strict mode for compile-time safety
5. **Performance**: Use Edge Runtime for API routes when possible
6. **UI/UX**: Provide loading states and error feedback for all async operations

## Common Tasks

### Adding a New Tool

1. Create a new file in `src/app/tools/` following the existing pattern
2. Use the `tool()` function from 'ai' package to define the tool
3. Define Zod schemas for parameters and return values
4. Add the tool to the orchestrator in `/api/report/route.ts`

### Modifying the UI

1. Components are in `src/app/components/`
2. Use Tailwind CSS v4 for styling
3. Maintain the brutalist design aesthetic with sketch borders and playful colors
4. Keep components focused and use custom hooks for state management
