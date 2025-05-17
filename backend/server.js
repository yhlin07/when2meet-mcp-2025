import express from "express"
import cors from "cors"
import rateLimit from "express-rate-limit"
import helmet from "helmet"
import { z } from "zod"
import { runMeetingPrep } from "./mcpClient.js"
import * as dotenv from "dotenv"
dotenv.config()

const app = express()
app.disable("x-powered-by")
app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }))
app.use(express.json({ limit: "2mb" }))

/** basic abuse-prevention */
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

const MeetingPrepSchema = z.object({
  linkedinUrl: z.string().url().default(""),
  websiteContent: z.string().max(50_000).optional().default(""),
})

app.post("/api/report", async (req, res) => {
  try {
    const params = MeetingPrepSchema.parse(req.body)

    const report = await runMeetingPrep(params, {
      timeoutMs: 90_000,
    })

    /* ✋ Guard: never send back an empty body */
    if (!report) {
      return res.status(504).json({ error: "Meeting-prep timed out" })
    }

    res.json(report) // { status, opener, questions: [...] }
  } catch (err) {
    console.error("[/api/report]", err)
    const status =
      err?.name === "ZodError"
        ? 400
        : err?.message?.includes("timeout")
        ? 504
        : 500
    res.status(status).json({ error: err.message })
  }
})

const PORT = Number.parseInt(process.env.PORT, 10) || 4000
app.listen(PORT, () => console.log(`⚡️  Backend ready on :${PORT}`))