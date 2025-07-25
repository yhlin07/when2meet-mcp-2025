import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { perplexitySearchTool } from '@/app/tools/perplexity-search'
import { openaiSummaryTool } from '@/app/tools/openai-summary'

export const runtime = 'edge'
export const maxDuration = 300

const MeetingPrepSchema = z.object({
  linkedinUrl: z.string().url(),
  websiteContent: z.string().max(50_000).optional().default(''),
})

const SYSTEM_PROMPT = /* md */ `
You are an AI orchestrator that prepares meeting dossiers by coordinating research and summary generation.

Your workflow:
1. Use the perplexity_search tool to research the LinkedIn profile and person's background
2. Use the openai_summary tool to generate a structured meeting dossier from the research

Always use both tools in sequence - first research, then summarize into the final dossier format.
Be thorough in your research but efficient in your orchestration.
`

// OpenAI provider setup for orchestration
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

async function handleMeetingPrep(params: {
  linkedinUrl: string
  websiteContent: string
}) {
  const userPrompt = `Please prepare a meeting dossier for this person:

LinkedIn Profile: ${params.linkedinUrl}
${
  params.websiteContent
    ? `Additional Notes: ${params.websiteContent}`
    : 'No additional notes provided.'
}

Please use your tools to:
1. Research their LinkedIn profile, recent activities, company information, and industry context
2. Generate a structured meeting dossier with personalized conversation starters

Make sure to research thoroughly before generating the final dossier.`

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
        perplexity_search: perplexitySearchTool,
        openai_summary: openaiSummaryTool,
      },
      maxSteps: 5,
      temperature: 0.3,
    })

    // Create custom SSE response to maintain compatibility with existing frontend
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let keepAliveInterval: NodeJS.Timeout | null = null
        let finalDossier: {
          status: string
          opener: string
          questions: Array<{ q: string; why: string }>
        } | null = null

        try {
          // Set up keep-alive heartbeat every 25 seconds
          keepAliveInterval = setInterval(() => {
            controller.enqueue(encoder.encode(':\n\n'))
          }, 25_000)

          let fullText = ''

          // Stream tokens to client and watch for tool results
          for await (const delta of result.fullStream) {
            if (delta.type === 'text-delta') {
              fullText += delta.textDelta
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: delta.textDelta })}\n\n`
                )
              )
            } else if (delta.type === 'tool-call') {
              // Send progress message when tools start
              let progressMessage = ''
              if (delta.toolName === 'perplexity_search') {
                progressMessage = '🔍 Researching LinkedIn profile and background...\n'
              } else if (delta.toolName === 'openai_summary') {
                progressMessage = '✨ Generating personalized meeting dossier...\n'
              }
              if (progressMessage) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ text: progressMessage })}\n\n`
                  )
                )
              }
            } else if (delta.type === 'tool-result') {
              // Send completion message and handle partial streaming
              if (delta.toolName === 'perplexity_search') {
                const completionMessage = '✅ Research complete! Analyzing findings...\n'
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ text: completionMessage })}\n\n`
                  )
                )
              } else if (delta.toolName === 'openai_summary') {
                // Capture the final dossier result and stream partial results
                if (delta.result) {
                  finalDossier = delta.result
                  
                  // Stream the opener first
                  if (finalDossier.opener) {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ 
                          partial_opener: finalDossier.opener 
                        })}\n\n`
                      )
                    )
                  }
                  
                  // Stream questions one by one with a small delay
                  if (finalDossier.questions) {
                    for (let i = 0; i < finalDossier.questions.length; i++) {
                      // Add a small delay between questions for visual effect
                      await new Promise(resolve => setTimeout(resolve, 500))
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ 
                            partial_question: finalDossier.questions[i],
                            question_index: i
                          })}\n\n`
                        )
                      )
                    }
                  }
                }
                
                const completionMessage = '🎉 Meeting dossier ready!\n\n'
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ text: completionMessage })}\n\n`
                  )
                )
              }
            }
          }

          // Send final result
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
            // Fallback: try to parse from text if no tool result found
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: ${JSON.stringify({
                  error:
                    'No structured dossier was generated. The AI may not have used the tools correctly.',
                  details: `Full response: ${fullText.slice(0, 500)}...`,
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
