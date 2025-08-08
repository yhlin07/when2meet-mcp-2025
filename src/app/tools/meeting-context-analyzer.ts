import { tool } from 'ai'
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

const MeetingContextSchema = z.object({
  meetingType: z
    .enum([
      'coffee_chat',
      'business_meeting',
      'networking',
      'interview',
      'casual_meetup',
      'formal_discussion',
    ])
    .describe('The primary type of meeting'),
  formalityLevel: z
    .number()
    .min(1)
    .max(5)
    .describe('Formality level from 1 (very casual) to 5 (very formal)'),
  primaryGoals: z.array(z.string()).describe('Key objectives or goals for the meeting'),
  suggestedTone: z.string().describe('Recommended conversational tone'),
  focusAreas: z.array(z.string()).describe('Specific topics or areas to emphasize'),
  contextSummary: z.string().describe('Brief summary of the meeting context'),
})

export const meetingContextAnalyzerTool = tool({
  description: 'Analyze meeting notes to understand context, type, and goals',
  inputSchema: z.object({
    linkedinUrl: z.string().describe('The LinkedIn URL of the person'),
    additionalNotes: z.string().describe('Notes about the meeting or person'),
  }),
  execute: async ({ linkedinUrl, additionalNotes }) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }

    const prompt = `Analyze the following meeting context and provide structured insights:

LinkedIn Profile: ${linkedinUrl}
Meeting Notes: ${additionalNotes || 'No specific notes provided'}

Please analyze:
1. What type of meeting is this? Consider the language used and implied purpose.
2. How formal or casual should the interaction be?
3. What are the likely goals or objectives?
4. What conversational tone would be most appropriate?
5. What topics or areas should be emphasized?

If the notes are vague or minimal, make reasonable inferences based on common professional meeting scenarios.`

    try {
      const { object } = await generateObject({
        model: openai('gpt-4.1'),
        schema: MeetingContextSchema,
        system:
          'You are an expert at understanding professional meeting contexts and providing nuanced analysis of interpersonal dynamics. You excel at reading between the lines and understanding both explicit and implicit meeting goals.',
        prompt,
        temperature: 0.3,
        maxOutputTokens: 500,
      })

      return object
    } catch (error) {
      console.error('[Meeting Context Analyzer] Error:', error)
      throw new Error(
        `Failed to analyze meeting context: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  },
})
