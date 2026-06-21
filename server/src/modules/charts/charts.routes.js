const express = require('express')
const { asyncHandler } = require('../../middleware/errorHandler')
const { authMiddleware } = require('../../middleware/auth')
const { requireTeacher } = require('../../middleware/rbac')
const { PrismaClient } = require('@prisma/client')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const router = express.Router()
const prisma = new PrismaClient()

router.use(authMiddleware)

router.get('/', asyncHandler(async (req, res) => {
  const charts = await prisma.chart.findMany({
    where: { ownerId: req.user.sub },
    orderBy: { createdAt: 'desc' },
    include: { dataset: { select: { title: true } } }
  })
  res.json(charts.map(c => ({ ...c, datasetTitle: c.dataset?.title })))
}))

router.get('/:id', asyncHandler(async (req, res) => {
  const chart = await prisma.chart.findUnique({ where: { id: req.params.id } })
  if (!chart) return res.status(404).json({ detail: 'Not found' })
  res.json(chart)
}))

router.post('/', requireTeacher, asyncHandler(async (req, res) => {
  const { title, chartType, datasetId, config, ...rest } = req.body
  const chart = await prisma.chart.create({
    data: { ownerId: req.user.sub, title, chartType: chartType || 'bar', datasetId, config: config || req.body }
  })
  res.status(201).json(chart)
}))

// AI-powered chart explanation endpoint
router.post('/explain', requireTeacher, asyncHandler(async (req, res) => {
  const { chartData, config, datasetTitle } = req.body
  if (!chartData?.length || !config) return res.status(400).json({ detail: 'chartData and config required' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // Fallback: generate rule-based explanation without AI
    return res.json(generateRuleBasedExplanation(chartData, config, datasetTitle))
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' })

  // Summarise the chart data for Gemini (avoid sending too many rows)
  const sample = chartData.slice(0, 15)
  const nums = chartData.map(d => d.y ?? d[config.yField]).filter(v => typeof v === 'number')
  const stats = nums.length ? {
    mean: (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2),
    min: Math.min(...nums).toFixed(2),
    max: Math.max(...nums).toFixed(2),
    range: (Math.max(...nums) - Math.min(...nums)).toFixed(2),
  } : null

  const prompt = `You are a secondary school mathematics teacher. Analyse this esports data chart and respond in JSON only.

Chart details:
- Title: "${config.title || 'Untitled Chart'}"
- Type: ${config.chartType} chart
- Dataset: ${datasetTitle || 'Esports dataset'}
- X axis (categories): ${config.xField}
- Y axis (values): ${config.yField}
- Aggregation: ${config.aggregation || 'none'}
- Data sample (first 15 points): ${JSON.stringify(sample)}
${stats ? `- Stats: mean=${stats.mean}, min=${stats.min}, max=${stats.max}, range=${stats.range}` : ''}

Respond with ONLY valid JSON (no markdown):
{
  "summary": "2-3 sentence plain English summary of what this chart shows and its key pattern",
  "mathsTopic": "The primary maths topic this chart relates to (e.g. Averages, Percentages, Ratios, Probability, Trends, Comparison, Range & IQR)",
  "keyInsights": ["insight 1 (specific, numeric)", "insight 2", "insight 3"],
  "discussionQuestions": ["question for students 1", "question 2", "question 3"],
  "forStudents": "1-2 sentence plain English description suitable for 13-16 year old students explaining what this chart shows",
  "teachingNote": "1 sentence tip for the teacher on how to use this chart in the lesson"
}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(clean)
    return res.json(parsed)
  } catch {
    return res.json(generateRuleBasedExplanation(chartData, config, datasetTitle))
  }
}))

function generateRuleBasedExplanation(chartData, config, datasetTitle) {
  const nums = chartData.map(d => d.y ?? 0).filter(v => typeof v === 'number')
  const mean = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : 'N/A'
  const max = nums.length ? Math.max(...nums).toFixed(2) : 'N/A'
  const min = nums.length ? Math.min(...nums).toFixed(2) : 'N/A'
  const highestPoint = chartData.find(d => (d.y ?? 0) === Math.max(...nums))
  return {
    summary: `This ${config.chartType} chart compares ${config.yField?.replace(/_/g,' ')} across different ${config.xField?.replace(/_/g,' ')} values from the ${datasetTitle || 'dataset'}. The highest value is ${max} and the lowest is ${min}, giving a range of ${(Math.max(...nums) - Math.min(...nums)).toFixed(2)}.`,
    mathsTopic: 'Averages & Comparison',
    keyInsights: [
      `Mean ${config.yField?.replace(/_/g,' ')}: ${mean}`,
      `Highest: ${highestPoint?.x ?? ''} with ${max}`,
      `Range (max - min): ${(Math.max(...nums) - Math.min(...nums)).toFixed(2)}`,
    ],
    discussionQuestions: [
      `Which category has the highest ${config.yField?.replace(/_/g,' ')}? Why do you think that is?`,
      `Calculate the mean of all values shown. Is any value above or below the mean?`,
      `What is the range of values in this chart?`,
    ],
    forStudents: `This chart shows ${config.yField?.replace(/_/g,' ')} for different ${config.xField?.replace(/_/g,' ')} values. You can compare which ones are higher or lower.`,
    teachingNote: `Use this chart to prompt discussion about why some values are higher than others, and introduce the concept of mean as a "fair comparison" across all values.`,
  }
}

// Chart data preview endpoint
router.post('/preview', requireTeacher, asyncHandler(async (req, res) => {
  const { datasetId, xField, yField, aggregation, seriesField } = req.body
  if (!datasetId || !xField || !yField) return res.json([])

  const rows = await prisma.datasetRow.findMany({ where: { datasetId }, take: 1000, select: { row: true } })
  const data = rows.map(r => r.row)

  if (aggregation && aggregation !== 'none' && seriesField) {
    const groups = {}
    data.forEach(r => {
      const key = r[xField]
      const series = r[seriesField]
      if (!groups[key]) groups[key] = {}
      if (!groups[key][series]) groups[key][series] = []
      const v = +r[yField]
      if (!isNaN(v)) groups[key][series].push(v)
    })
    const result = Object.entries(groups).map(([x, series]) => {
      const entry = { x }
      Object.entries(series).forEach(([s, vals]) => { entry[s] = applyAgg(aggregation, vals) })
      return entry
    })
    return res.json(result)
  }

  if (aggregation && aggregation !== 'none') {
    const groups = {}
    data.forEach(r => {
      const key = r[xField]
      if (!groups[key]) groups[key] = []
      const v = +r[yField]
      if (!isNaN(v)) groups[key].push(v)
    })
    return res.json(Object.entries(groups).map(([x, vals]) => ({ x, y: applyAgg(aggregation, vals) })))
  }

  return res.json(data.slice(0, 100).map(r => ({ x: r[xField], y: r[yField] })))
}))

router.patch('/:id', requireTeacher, asyncHandler(async (req, res) => {
  const chart = await prisma.chart.findUnique({ where: { id: req.params.id } })
  if (!chart || chart.ownerId !== req.user.sub) return res.status(404).json({ detail: 'Not found' })
  const updated = await prisma.chart.update({ where: { id: req.params.id }, data: req.body })
  res.json(updated)
}))

router.delete('/:id', requireTeacher, asyncHandler(async (req, res) => {
  const chart = await prisma.chart.findUnique({ where: { id: req.params.id } })
  if (!chart || chart.ownerId !== req.user.sub) return res.status(404).json({ detail: 'Not found' })
  await prisma.chart.delete({ where: { id: req.params.id } })
  res.status(204).end()
}))

router.post('/:id/share', requireTeacher, asyncHandler(async (req, res) => {
  const { classroomId } = req.body
  await prisma.classroomChart.upsert({ where: { classroomId_chartId: { classroomId, chartId: req.params.id } }, update: {}, create: { classroomId, chartId: req.params.id } })
  res.json({ shared: true })
}))

function applyAgg(op, vals) {
  if (!vals.length) return 0
  switch (op) {
    case 'sum': return vals.reduce((a, b) => a + b, 0)
    case 'min': return Math.min(...vals)
    case 'max': return Math.max(...vals)
    case 'count': return vals.length
    default: return vals.reduce((a, b) => a + b, 0) / vals.length
  }
}

module.exports = router
