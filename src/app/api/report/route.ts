import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { streamText, stepCountIs } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { perplexitySearchTool } from '@/app/tools/perplexity-search'
import { openaiSummaryTool, type Dossier } from '@/app/tools/openai-summary'
import { meetingContextAnalyzerTool } from '@/app/tools/meeting-context-analyzer'

export const runtime = 'edge'
export const maxDuration = 300

const MeetingPrepSchema = z.object({
  linkedinUrl: z.string().url(),
  additionalNotes: z.string().max(50_000).optional().default(''),
})

const SYSTEM_PROMPT = `
You are an expert meeting preparation assistant that creates highly personalized, context-aware dossiers by orchestrating research and summary generation.

Your workflow:
1. Use the meeting_context_analyzer tool to understand the meeting type, goals, and appropriate tone
2. Use the perplexity_search tool to research the LinkedIn profile, incorporating insights from the context analysis
3. Use the openai_summary tool to generate a structured dossier that aligns with the analyzed context

Key principles:
- Let the context analysis guide your entire approach
- Focus your research based on the identified meeting goals and focus areas
- Adapt the dossier's tone to match the formality level identified
- When LinkedIn information is limited: Research their company, industry trends, and find alternative angles
- Ensure all outputs align with the meeting's purpose and context

Remember: The context analysis is your north star - use it to create truly personalized, relevant dossiers.
`

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const params = MeetingPrepSchema.parse(body)

    return await handleMeetingPrep(params)
  } catch (err: unknown) {
    console.error('[POST /api/report]', err)
    const error = err instanceof Error ? err : new Error(String(err))
    const status = error.name === 'ZodError' ? 400 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
}

async function handleMeetingPrep(params: { linkedinUrl: string; additionalNotes: string }) {
  const userPrompt = `Please prepare a meeting dossier for this person:

LinkedIn Profile: ${params.linkedinUrl}
Meeting Notes: ${params.additionalNotes || 'No specific notes provided'}

Follow this workflow:

1. Context Analysis (using meeting_context_analyzer):
   - Analyze the meeting notes to understand the type, formality, goals, and focus areas
   - This analysis will guide your entire approach

2. Research Phase (using perplexity_search):
   - Research the LinkedIn profile and related information
   - Focus your research based on the context analysis results
   - Pay special attention to the identified focus areas and meeting goals
   - If profile info is limited, research their company and industry

3. Dossier Generation (using openai_summary):
   - Create a dossier that matches the analyzed context
   - Ensure the tone matches the formality level identified
   - Focus questions on the primary goals from the context analysis
   - Make everything feel natural and specific to this meeting

IMPORTANT: You must use all three tools in sequence. The context analysis is crucial for creating a truly personalized dossier.`

  try {
    const result = await streamText({
      model: openai.chat('gpt-4.1'),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      tools: {
        meeting_context_analyzer: meetingContextAnalyzerTool,
        perplexity_search: perplexitySearchTool,
        openai_summary: openaiSummaryTool,
      },
      // Limit the number of tool-execution LLM steps to avoid loops
      stopWhen: stepCountIs(10),
      temperature: 0.4,
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let keepAliveInterval: NodeJS.Timeout | null = null
        let finalDossier: (Dossier & { status: string }) | null = null

        try {
          keepAliveInterval = setInterval(() => {
            controller.enqueue(encoder.encode(':\n\n'))
          }, 25_000)

          for await (const delta of result.fullStream) {
            if (delta.type === 'tool-call') {
              let progressMessage = ''
              if (delta.toolName === 'meeting_context_analyzer') {
                progressMessage = '🧠 Analyzing meeting context and goals...'
              } else if (delta.toolName === 'perplexity_search') {
                progressMessage = '🕵️ Investigating LinkedIn profile and background...'
              } else if (delta.toolName === 'openai_summary') {
                progressMessage = '📝 Crafting your personalized dossier...'
              }
              if (progressMessage) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: progressMessage })}\n\n`)
                )
              }
            } else if (delta.type === 'tool-result') {
              if (delta.toolName === 'meeting_context_analyzer') {
                const completionMessage = '💡 Context mapped! Starting research...'
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: completionMessage })}\n\n`)
                )
              } else if (delta.toolName === 'perplexity_search') {
                const completionMessage = '📊 Intel gathered! Analyzing findings...'
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: completionMessage })}\n\n`)
                )
              } else if (delta.toolName === 'openai_summary') {
                if (delta.output) {
                  finalDossier = {
                    status: 'complete',
                    ...(delta.output as Dossier),
                  }
                }
                const completionMessage = '🎯 Dossier delivered!'
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: completionMessage })}\n\n`)
                )
              }
            }
          }

          if (finalDossier) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  report: finalDossier,
                })}\n\n`
              )
            )
          } else {
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({
                  error:
                    'No structured dossier was generated. The AI may not have used the tools correctly.',
                })}\n\n`
              )
            )
          }

          controller.close()
        } catch (err: unknown) {
          console.error('[/api/report] Stream error:', err)
          const errorMessage = err instanceof Error ? err.message : String(err)
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({
                error: errorMessage,
              })}\n\n`
            )
          )
          controller.close()
        } finally {
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval)
          }
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err: unknown) {
    console.error('[/api/report] Error:', err)
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
