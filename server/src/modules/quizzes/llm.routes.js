const express = require('express')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { asyncHandler } = require('../../middleware/errorHandler')
const { authMiddleware } = require('../../middleware/auth')
const { requireTeacher } = require('../../middleware/rbac')

const router = express.Router()

router.use(authMiddleware, requireTeacher)

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw { status: 503, message: 'AI not configured. Add GEMINI_API_KEY to server/.env' }
  return new GoogleGenerativeAI(apiKey)
}

const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash'

/**
 * POST /api/v1/quizzes/llm/enhance
 * Rephrases a question in 3 student-friendly styles.
 * IMPORTANT: Gemini only rephrases — the rule engine computed the correct answer.
 * This hybrid approach prevents hallucinated answers (Kurdi et al., 2020).
 */
router.post('/enhance', asyncHandler(async (req, res) => {
  const { prompt, topic, difficulty, questionType, correctAnswer } = req.body
  if (!prompt) return res.status(400).json({ detail: 'prompt required' })

  const genAI = getClient()
  const model = genAI.getGenerativeModel({ model: MODEL() })

  const instruction = `You are an expert secondary school mathematics teacher specialising in esports data.
Rephrase the following maths question in exactly 3 student-friendly styles.

STRICT RULES:
- The mathematical answer must remain IDENTICAL in all 3 versions: ${JSON.stringify(correctAnswer)}
- Never change numbers, data references, or what is being calculated
- Language must suit 13-16 year olds (KS3/KS4 level)
- Style 1 "formal": precise academic wording
- Style 2 "conversational": friendly and casual
- Style 3 "scenario": sets up an in-game narrative context

Original question: "${prompt}"
Topic: ${topic || 'mathematics'} | Difficulty: ${difficulty || 'medium'} | Type: ${questionType || 'numeric'}

Respond with ONLY valid JSON, no markdown, no backticks:
{
  "versions": [
    { "style": "formal", "prompt": "..." },
    { "style": "conversational", "prompt": "..." },
    { "style": "scenario", "prompt": "..." }
  ],
  "teacherNote": "One sentence on the pedagogical value of this question."
}`

  const result = await model.generateContent(instruction)
  const text = result.response.text().trim()

  let parsed
  try {
    // Strip markdown code fences if Gemini wraps output
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    parsed = match ? JSON.parse(match[0]) : { versions: [], teacherNote: '' }
  }

  res.json(parsed)
}))

/**
 * POST /api/v1/quizzes/llm/hint
 * Generates a pedagogical hint without revealing the answer.
 */
router.post('/hint', asyncHandler(async (req, res) => {
  const { prompt, topic } = req.body
  if (!prompt) return res.status(400).json({ detail: 'prompt required' })

  const genAI = getClient()
  const model = genAI.getGenerativeModel({ model: MODEL() })

  const result = await model.generateContent(
    `Write ONE short hint (max 2 sentences) for this maths question that helps a student think about the METHOD without revealing the answer.
Question: "${prompt}"
Topic: ${topic || 'maths'}
Return only the hint text, no preamble, no quotes.`
  )

  res.json({ hint: result.response.text().trim() })
}))

/**
 * POST /api/v1/quizzes/llm/explain
 * Explains why a correct answer is correct, after a question ends.
 */
router.post('/explain', asyncHandler(async (req, res) => {
  const { prompt, correctAnswer, topic } = req.body
  if (!prompt) return res.status(400).json({ detail: 'prompt required' })

  const genAI = getClient()
  const model = genAI.getGenerativeModel({ model: MODEL() })

  const result = await model.generateContent(
    `Explain in 2-3 sentences why the following answer is correct for this maths question.
Use clear, encouraging language suitable for secondary school students (age 13-16).
Question: "${prompt}"
Correct answer: ${JSON.stringify(correctAnswer)}
Topic: ${topic || 'maths'}
Return only the explanation, no preamble.`
  )

  res.json({ explanation: result.response.text().trim() })
}))

/**
 * POST /api/v1/quizzes/llm/generate-context
 * Uses Gemini to create a short esports narrative context around a dataset stat,
 * making questions feel more engaging. Answer still computed by rule engine.
 */
router.post('/generate-context', asyncHandler(async (req, res) => {
  const { stat, value, game = 'Dota 2', playerName } = req.body
  if (!stat) return res.status(400).json({ detail: 'stat required' })

  const genAI = getClient()
  const model = genAI.getGenerativeModel({ model: MODEL() })

  const result = await model.generateContent(
    `Write a 1-2 sentence esports scenario for a school maths question using this data point.
Game: ${game}
Stat: ${stat}
Value: ${value}
Player/Team: ${playerName || 'a pro player'}
Make it exciting and age-appropriate for 13-16 year olds. Return only the scenario text.`
  )

  res.json({ context: result.response.text().trim() })
}))

module.exports = router
