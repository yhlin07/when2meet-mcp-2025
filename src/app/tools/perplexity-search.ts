import { tool } from 'ai'
import { perplexity } from '@ai-sdk/perplexity'
import { generateText } from 'ai'
import { z } from 'zod'

export const perplexitySearchTool = tool({
  description:
    'Search the web using Perplexity AI to research LinkedIn profiles and company information',
  parameters: z.object({
    query: z.string().describe('The search query to research'),
  }),
  execute: async ({ query }) => {
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY environment variable is not set')
    }

    const enhancedQuery = `${query}

Please provide comprehensive information including:
- Professional background and current role details
- Recent career updates or achievements
- Company information and recent company news
- Notable projects, publications, or speaking engagements
- Educational background and certifications
- Any shared connections, interests, or experiences that could serve as conversation starters
- Industry context and trends relevant to their role

If the LinkedIn profile has limited information, please:
- Research their current company and team
- Look for alternative sources (company website, news articles, etc.)
- Provide industry-specific context that could be relevant
- Find interesting facts about their company or field

Focus on recent and relevant information that would be useful for a professional meeting.`

    try {
      const { text, usage } = await generateText({
        model: perplexity('sonar'),
        prompt: enhancedQuery,
        temperature: 0.3,
        maxTokens: 4000,
      })

      return {
        content: text,
        usage: usage || null,
      }
    } catch (error) {
      console.error('[Perplexity Search Tool] Error:', error)
      throw new Error(
        `Failed to search with Perplexity: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  },
})
