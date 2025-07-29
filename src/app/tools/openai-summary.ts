import { tool } from 'ai'
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

const DossierSchema = z.object({
  opener: z.string().describe('Two-sentence personalized ice-breaker based on research'),
  questions: z
    .array(
      z.object({
        q: z.string().describe('Thoughtful open-ended question'),
        why: z.string().describe('Brief rationale for asking this question'),
      })
    )
    .length(3)
    .describe('Exactly 3 contextual questions'),
})

export const openaiSummaryTool = tool({
  description: 'Generate a structured meeting dossier from research data using OpenAI',
  parameters: z.object({
    researchData: z.string().describe('Raw research data about the person and their background'),
    linkedinUrl: z.string().describe('The LinkedIn URL being researched'),
    additionalNotes: z.string().optional().describe('Additional notes about the person/meeting'),
  }),
  execute: async ({ researchData, linkedinUrl, additionalNotes }) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }

    const prompt = `Based on the following research data, create a structured meeting preparation dossier.

Research Data:
${researchData}

LinkedIn Profile: ${linkedinUrl}
${additionalNotes ? `Additional Notes: ${additionalNotes}` : ''}

Generate a personalized meeting dossier with:
1. A two-sentence ice-breaker that shows you've done your homework
2. Exactly 3 thoughtful, open-ended questions that will lead to meaningful conversation

Focus on recent activities, professional achievements, company developments, or industry insights that would make for natural conversation starters.`

    try {
      const { object } = await generateObject({
        model: openai('gpt-4.1'),
        schema: DossierSchema,
        system:
          'You are a research assistant that creates structured meeting preparation dossiers.',
        prompt,
        temperature: 0.7,
        maxTokens: 1000,
      })

      return object
    } catch (error) {
      console.error('[OpenAI Summary Tool] Error:', error)
      throw new Error(
        `Failed to generate summary with OpenAI: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  },
})
