import { tool } from 'ai'
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
      const response = await fetch(
        'https://api.perplexity.ai/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              {
                role: 'user',
                content: query,
              },
            ],
            stream: false,
            temperature: 0.3,
            max_tokens: 4000,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Perplexity API error response:`, errorText)
        throw new Error(
          `Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const data = await response.json()

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error(
          'Invalid Perplexity response:',
          JSON.stringify(data, null, 2)
        )
        throw new Error('Invalid response format from Perplexity API')
      }

      return {
        content: data.choices[0].message.content,
        usage: data.usage || null,
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
