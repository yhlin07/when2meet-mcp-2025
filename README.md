# Meeting Prep AI

An intelligent meeting preparation tool that generates personalized dossiers by researching LinkedIn profiles and company information using AI-powered web search and analysis.

## Overview

This Next.js application helps you prepare for meetings by:

- Analyzing LinkedIn profiles to understand professional backgrounds
- Researching company information and recent developments
- Generating personalized ice-breakers and contextual questions
- Providing real-time streaming responses for immediate insights

## Features

- **LinkedIn Profile Analysis**: Deep research into professional backgrounds, experience, and connections
- **Company Research**: Current news, developments, and contextual information
- **Personalized Ice-Breakers**: Two-sentence conversation starters tailored to the individual
- **Strategic Questions**: Open-ended questions with rationale for meaningful engagement
- **Real-Time Streaming**: Live updates as the AI researches and generates insights
- **Retro UI Design**: Clean, brutalist interface with playful styling

## Setup

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- API keys for Perplexity and OpenAI

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd when2meet-mcp-2025
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys:

```env
# Perplexity API key for web research via tools
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# OpenAI API key for orchestration and summary generation
OPENAI_API_KEY=your_openai_api_key_here
```

### Required API Keys

- **Perplexity API**: Used for web research and LinkedIn profile analysis
- **OpenAI API**: Powers the orchestration and dossier generation

## Usage

1. Start the development server:

```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Enter a LinkedIn URL and optional website notes

4. Click "Let's go!" to generate your meeting dossier

5. Watch as the AI streams real-time research and generates personalized insights

## Architecture

### Tech Stack

- **Next.js 15**: React framework with App Router and Edge Runtime
- **Vercel AI SDK**: Streaming text generation and tool orchestration
- **OpenAI GPT-4o-mini**: AI orchestration and summary generation
- **Perplexity API**: Web research and real-time information gathering
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Styling with custom brutalist design
- **Zod**: Runtime type validation and structured outputs

### System Design

The application uses a tool-based orchestrator architecture:

1. **Frontend Components** (`src/app/components/`):

   - `meeting-form.tsx`: Input form with real-time streaming display
   - `report-view.tsx`: Structured dossier presentation

2. **API Layer** (`src/app/api/report/route.ts`):

   - Edge runtime endpoint with 300-second timeout
   - Server-Sent Events (SSE) streaming with keep-alive heartbeats
   - Input validation using Zod schemas

3. **AI Tools** (`src/app/tools/`):
   - `perplexity-search.ts`: Web research tool wrapper
   - `openai-summary.ts`: Structured dossier generation with validation

### Data Flow

1. User submits LinkedIn URL + optional notes
2. Edge runtime orchestrator coordinates two-phase workflow:
   - **Research Phase**: Perplexity search for profile and company data
   - **Summary Phase**: OpenAI generates structured dossier
3. Real-time streaming throughout both phases
4. Final structured output with ice-breakers and questions

## Development

### Available Scripts

- **Start development server**: `npm run dev` (with Turbopack for faster builds)
- **Build for production**: `npm run build`
- **Start production server**: `npm start`
- **Lint code**: `npm run lint`

### Code Style

- **File naming**: kebab-case for all files
- **Import paths**: Use "@/" alias instead of relative imports
- **TypeScript**: Strict typing with Zod validation

## Deployment

### Vercel (Recommended)

This application is optimized for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `PERPLEXITY_API_KEY`
   - `OPENAI_API_KEY`
3. Deploy automatically on push to main branch

The application uses Edge Runtime for optimal performance and global distribution.

### Other Platforms

The application can be deployed on any platform supporting Next.js 15:

- Ensure Node.js 18+ runtime
- Set required environment variables
- Build with `npm run build`
- Start with `npm start`

## Response Format

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

## Contributing

1. Follow the code style preferences in `CLAUDE.md`
2. Use the provided development commands
3. Ensure all environment variables are properly configured
4. Test streaming functionality before submitting changes

## License

[Add your license information here]
