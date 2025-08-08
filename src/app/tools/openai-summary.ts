import { tool } from 'ai'
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

const SankeyDataSchema = z.object({
  nodes: z.array(
    z.object({
      name: z.string().describe('Node name displayed in the sankey diagram'),
    })
  ),
  links: z.array(
    z.object({
      source: z.number().describe('Source node index in nodes array (0-based)'),
      target: z.number().describe('Target node index in nodes array (0-based)'),
      value: z.number().min(0).describe('Flow magnitude'),
    })
  ),
})

const TimelineDataSchema = z.array(
  z.object({
    title: z.string(),
    company: z.string().optional(),
    period: z.string(),
    start: z.string().optional(),
    end: z.string().nullable().optional(),
    notes: z.string().optional(),
  })
)

const SimpleSeriesSchema = z.array(z.object({ label: z.string(), value: z.number() }))

const VisualizationSchema = z.object({
  type: z
    .enum(['bar', 'pie', 'line', 'sankey', 'timeline'])
    .describe('Chart type chosen to best explain the data'),
  title: z.string().describe('Human-friendly chart title'),
  description: z.string().optional().describe('Short caption for the chart'),
  data: z
    .union([SimpleSeriesSchema, SankeyDataSchema, TimelineDataSchema])
    .describe(
      'Data for the chosen chart type. For bar/pie/line: array of {label, value}. For sankey: {nodes, links}. For timeline: array of items with period.'
    ),
})

export const DossierSchema = z.object({
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
  analytics: z
    .object({
      careerTimeline: z
        .array(
          z.object({
            title: z.string().describe('Role or milestone title'),
            company: z.string().optional().describe('Company or organization, if applicable'),
            period: z.string().describe('Human-readable period like "2021–Present" or "2018–2020"'),
            start: z.string().optional().describe('ISO-like date or year-month, e.g., 2021-05'),
            end: z
              .string()
              .nullable()
              .optional()
              .describe('ISO-like date or year-month; null or missing if present'),
            notes: z.string().optional().describe('Short note on responsibilities/impact'),
          })
        )
        .min(1)
        .max(8)
        .describe('Chronological career or project timeline entries derived from research'),
      focusBreakdown: z
        .array(
          z.object({
            label: z.string().describe('Focus area or theme'),
            weight: z
              .number()
              .min(0)
              .max(100)
              .describe('Relative emphasis as a percentage (0–100)'),
          })
        )
        .min(3)
        .max(7)
        .describe('Breakdown of recommended conversation focus areas'),
      meetingFlow: z
        .array(
          z.object({
            step: z.string().describe('Short step name, e.g., Rapport'),
            intent: z.string().describe('Goal of this step'),
            suggestedQuestions: z
              .array(z.string())
              .optional()
              .describe('Optional quick prompts for this step'),
          })
        )
        .min(3)
        .max(5)
        .describe('Suggested order of the conversation in 3–5 steps'),
    })
    .optional()
    .describe('Chart-ready analytics to visualize journey and focus areas'),
  visualizations: z
    .array(VisualizationSchema)
    .min(1)
    .max(2)
    .optional()
    .describe(
      'One visualization by default. Include a second only if it conveys orthogonal insights. Types: bar, pie, line, sankey, timeline.'
    ),
})

export type Dossier = z.infer<typeof DossierSchema>

export const openaiSummaryTool = tool({
  description: 'Generate a structured meeting dossier from research data using OpenAI',
  inputSchema: z.object({
    researchData: z.string().describe('Raw research data about the person and their background'),
    linkedinUrl: z.string().describe('The LinkedIn URL being researched'),
    additionalNotes: z.string().optional().describe('Additional notes about the person/meeting'),
  }),
  execute: async ({ researchData, linkedinUrl, additionalNotes }, _options) => {
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

 4. Include chart visualizations (if possible from research):
    Decide the most informative chart type(s) and provide data strictly following this schema:
    - type: one of bar | pie | line | sankey | timeline
    - title: short human-readable title
    - description: optional caption
    - data:
      • for bar/pie/line: [{ label: string, value: number }]
      • for sankey: { nodes: [{ name }], links: [{ source: number, target: number, value }] } where source/target are 0-based indices into nodes
      • for timeline: [{ title, company?, period, start?, end?, notes? }]
    Default to exactly 1 visualization. Include a 2nd only if it communicates a different dimension (e.g., one timeline + one focus breakdown). Avoid duplicates (e.g., both bar and pie for the same series). Keep values consistent with research; when uncertain, stay high-level but plausible.

Output MUST strictly follow the provided JSON schema fields.

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
        maxOutputTokens: 1500,
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
