import { tool } from 'ai'
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

const DossierSchema = z.object({
  opener: z
    .string()
    .describe(
      'Two-sentence personalized ice-breaker that feels natural and shows genuine interest based on the research and meeting context'
    ),
  questions: z
    .array(
      z.object({
        q: z
          .string()
          .describe('Specific, engaging question tailored to the person and meeting purpose'),
        why: z
          .string()
          .describe('Brief rationale explaining how this question serves the meeting goals'),
      })
    )
    .length(3)
    .describe(
      'Exactly 3 contextual questions that progressively build rapport and achieve meeting objectives'
    ),
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
${additionalNotes ? `Meeting Context: ${additionalNotes}` : 'Meeting Type: Professional meeting'}

Important Guidelines:

1. Analyze the meeting context:
   - If it's a coffee chat: Create a warm, friendly tone focused on personal connection
   - If it's business-focused: Maintain professionalism while showing genuine interest
   - Consider any specific goals or topics mentioned in the notes

2. For the ice-breaker:
   - Make it feel conversational and natural, not scripted
   - Reference something specific and recent from the research
   - If information is limited, use company/industry insights creatively
   - For coffee chats: Be more casual and personal
   - For business meetings: Balance professionalism with warmth

3. For the questions:
   - Question 1: Start with something that builds rapport based on their background
   - Question 2: Dive deeper into their expertise or current projects
   - Question 3: Explore future-oriented topics or mutual interests
   - Ensure questions feel organic to the meeting type
   - Avoid generic questions like "What are your biggest challenges?"
   - Make questions specific to their role, company, or interests

4. Special handling for limited profiles:
   - Focus on their company's recent developments
   - Ask about their specific role within larger initiatives
   - Use industry trends as conversation starters
   - Be curious about their unique perspective

Remember: The goal is to facilitate a genuine connection, not conduct an interview.`

    try {
      const { object } = await generateObject({
        model: openai('gpt-4.1'),
        schema: DossierSchema,
        system:
          'You are an expert at creating personalized meeting preparation dossiers that help people have meaningful conversations. You understand the nuances of different meeting types (coffee chats, business meetings, networking) and adapt your tone and content accordingly. You excel at finding unique angles and avoiding generic talking points.',
        prompt,
        temperature:
          additionalNotes?.toLowerCase().includes('coffee') ||
          additionalNotes?.toLowerCase().includes('chat')
            ? 0.8
            : 0.7,
        maxTokens: 1500,
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
