import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import Anthropic from "@anthropic-ai/sdk"
import pc from "picocolors"
import process from "node:process"

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-7-sonnet-latest"
const SONAR_SERVER_CMD = "npx"
const SONAR_SERVER_ARGS = ["-y", "@chatmcp/server-perplexity-ask"]
const MCP_CLIENT_META = {
  name: "when2meet-meeting-prep",
  version: "2025.05.17",
}
const SYSTEM_PROMPT = /* md */ `
You are a research agent that prepares concise meeting dossiers.
Use the "perplexity-ask.search" tool freely for live web research.

IMPORTANT: You MUST ONLY respond with a valid JSON object in the following format:
{
  "status": "complete",
  "opener": "<two-sentence personalised ice-breaker>",
  "questions": [
    { "q": "<open-ended question>", "why": "<one-sentence rationale>" }
  ]
}

Do not include any other text, explanations, or natural language outside of this JSON structure.
All content should be contained within the JSON fields.
`
const DEFAULT_TIMEOUT_MS = 120_000

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} MeetingPrepInput
 * @property {string} linkedinUrl
 * @property {string} websiteContent
 *
 * @typedef {Object} MeetingPrepOptions
 * @property {number} [timeoutMs]
 */

/* -------------------------------------------------------------------------- */
/*  Entry-point                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Calls Claude once (no streaming) and returns the final dossier, or throws.
 * @param {MeetingPrepInput} input
 * @param {MeetingPrepOptions} [options]
 */
export async function runMeetingPrep(
  input,
  { timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) {
  console.log(pc.cyan(`→ runMeetingPrep(${input.linkedinUrl})`))

  /* ------------------ launch Perplexity Ask MCP server ------------------- */
  const transport = new StdioClientTransport({
    command: SONAR_SERVER_CMD,
    args: SONAR_SERVER_ARGS,
    env: {
      ...process.env,
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    },
  })
  const client = new Client(MCP_CLIENT_META)
  await client.connect(transport)

  const dossierTool = {
    name: "return_meeting_dossier",
    description:
      "When you've finished researching, call this tool with the final dossier. " +
      'The "status" field **must** be "complete".',
    input_schema: {
      type: "object",
      required: ["status", "opener", "questions"],
      properties: {
        status: { type: "string", enum: ["complete"] },
        opener: { type: "string" },
        questions: {
          type: "array",
          items: {
            type: "object",
            required: ["q", "why"],
            properties: {
              q: { type: "string" },
              why: { type: "string" },
            },
          },
        },
      },
    },
  }

  /* fetch tool catalogue once (still supplied to Claude even if we don't stream) */
  const { tools: rawTools } = await client.listTools()
  const tools = [
    ...rawTools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    })),
  ]

  /* ---------------------------- Claude call ------------------------------ */
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const abort = new AbortController()
  const ttl = setTimeout(() => abort.abort("timeout"), timeoutMs)

  try {
    /** @type import("@anthropic-ai/sdk").MessagesParam */
    const messages = [
      {
        role: "user",
        content: `You are preparing for a meeting. Please research and return ONLY a JSON response.

LinkedIn: ${input.linkedinUrl || "—"}
Notes from their website:
${input.websiteContent}

Remember to ONLY return a valid JSON object with the specified structure. No other text.`,
      },
    ]

    let finalResponse = null
    while (!finalResponse) {
      const ai = await anthropic.messages.create(
        {
          model: CLAUDE_MODEL,
          system: SYSTEM_PROMPT,
          max_tokens: 1_000,
          messages,
          tools,
        },
        { signal: abort.signal }
      )

      // Handle tool usage
      if (ai.content) {
        for (const content of ai.content) {
          if (content.type === "tool_use") {
            console.log(content.name, content.input)
            // Execute the tool
            const toolResult = await client.callTool(
              content.name,
              content.input
            )
            console.log(toolResult)

            // Add tool result to messages
            messages.push({ role: "assistant", content: ai.content })
            messages.push({
              role: "tool",
              content: JSON.stringify(toolResult),
              tool_name: content.name,
            })
          } else if (content.type === "text") {
            try {
              // Try to parse as JSON to see if it's our final response
              const parsed = JSON.parse(content.text)
              if (parsed.status === "complete") {
                finalResponse = parsed
              }
            } catch (e) {
              // Not JSON or not complete, continue conversation
            }
          }
        }
      }
    }

    return JSON.stringify(finalResponse, null, 2)
  } finally {
    clearTimeout(ttl)
    await client.close().catch(() => null)
  }
}
