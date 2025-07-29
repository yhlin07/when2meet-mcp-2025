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

    try {
      const { text, usage } = await generateText({
        model: perplexity('sonar'),
        prompt: query,
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
