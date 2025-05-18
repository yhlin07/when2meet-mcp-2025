/* -------------------------------------------------------------------------- */
/*  when2meet — Meeting-prep MCP client                                       */
/* -------------------------------------------------------------------------- */
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
Use the "perplexity_ask" tool freely for live web research.

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
export async function runMeetingPrep(input) {
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

  /* Dossier-return tool so Claude can mark completion explicitly */
  const dossierTool = {
    name: "return_meeting_dossier",
    description:
      "Call this when you have finished researching. MUST supply the final dossier JSON. The `status` field must equal `complete`.",
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

  /* ------------------- Discover available MCP tools --------------------- */
  const { tools: rawTools } = await client.listTools()
  const tools = [
    ...rawTools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    })),
    dossierTool,
  ]

  /* ---------------------------- Claude call ------------------------------ */
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const abort = new AbortController()

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

    /* ─── Dialogue loop until dossier returned ─────────────────────────── */
    while (!finalResponse) {
      const ai = await anthropic.messages.create(
        {
          model: CLAUDE_MODEL,
          system: SYSTEM_PROMPT,
          max_tokens: 64_000,
          messages,
          tools,
        },
        { signal: abort.signal }
      )

      console.log(JSON.stringify(messages, null, 2))

      for (const part of ai.content ?? []) {
        /* ─── Tool requests from Claude ─────────────────────────────────── */
        if (part.type === "tool_use") {
          const { id: toolUseId, name: toolName, input: toolArgs } = part

          /* 1. Echo the tool_use back to context as an assistant message */
          messages.push({
            role: "assistant",
            content: [part],
          })

          /* 2. Actually execute the tool via MCP */
          let toolResult
          try {
            if (toolName === "return_meeting_dossier") {
              // If it's our special dossier tool, validate and set as final response
              if (toolArgs?.status === "complete") {
                finalResponse = toolArgs
                break
              }
            } else {
              toolResult = await client.callTool({
                name: toolName,
                arguments: toolArgs,
              })
            }
          } catch (err) {
            toolResult = { error: err?.message ?? String(err) }
          }

          /* 3. Return tool output to Claude (must be role "user") */
          messages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUseId,
                content: JSON.stringify(toolResult),
              },
            ],
          })
        } else if (part.type === "text") {
          /* ─── Plain text from Claude ────────────────────────────────────── */
          messages.push({
            role: "assistant",
            content: [part],
          })
        }
      }
    }

    /* Pretty-print before returning to caller */
    return finalResponse
  } finally {
    await client.close().catch(() => null)
  }
}
