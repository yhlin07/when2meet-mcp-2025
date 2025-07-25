import { tool } from 'ai'
import { z } from 'zod'
import OpenAI from 'openai'

const DossierSchema = z.object({
  status: z.literal('complete'),
  opener: z
    .string()
    .describe('Two-sentence personalized ice-breaker based on research'),
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
  description:
    'Generate a structured meeting dossier from research data using OpenAI',
  parameters: z.object({
    researchData: z
      .string()
      .describe('Raw research data about the person and their background'),
    linkedinUrl: z.string().describe('The LinkedIn URL being researched'),
    websiteNotes: z
      .string()
      .optional()
      .describe('Additional notes from their website'),
  }),
  execute: async ({ researchData, linkedinUrl, websiteNotes }) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }

    const prompt = `Based on the following research data, create a structured meeting preparation dossier.

Research Data:
${researchData}

LinkedIn Profile: ${linkedinUrl}
${websiteNotes ? `Additional Notes: ${websiteNotes}` : ''}

Generate a personalized meeting dossier with:
1. A two-sentence ice-breaker that shows you've done your homework
2. Exactly 3 thoughtful, open-ended questions that will lead to meaningful conversation

Focus on recent activities, professional achievements, company developments, or industry insights that would make for natural conversation starters.

CRITICAL: Respond with ONLY a valid JSON object matching this exact structure:
{
  "status": "complete",
  "opener": "Two-sentence personalized ice-breaker based on your research.",
  "questions": [
    { "q": "Thoughtful open-ended question", "why": "Brief rationale for asking" },
    { "q": "Another engaging question", "why": "Why this question matters" },
    { "q": "Third contextual question", "why": "Strategic reasoning" }
  ]
}

No additional text before or after the JSON.`

    try {
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      })

      const response = await client.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content:
              'You are a research assistant that creates structured meeting preparation dossiers. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content received from OpenAI')
      }

      // Extract JSON from response (in case there's extra text)
      let jsonStr = content.trim()
      jsonStr = jsonStr
        .replace(/^```(?:json)?\s*\n?/gm, '')
        .replace(/\n?\s*```$/gm, '')

      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error(`No JSON object found in OpenAI response: ${content}`)
      }

      const dossier = JSON.parse(jsonMatch[0])

      // Validate the structure
      const validated = DossierSchema.parse(dossier)

      return validated
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
