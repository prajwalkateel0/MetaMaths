/**
 * Rule-based question generation engine.
 * Generates mathematically verified questions from esports dataset rows.
 * Never uses LLM for answers — only for rephrasing (optional).
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const TEMPLATES = {
  averages: [
    {
      template: (data, field, entity) => ({
        prompt: `What is the mean ${field} across all ${entity} entries in the dataset?`,
        compute: (rows) => {
          const vals = rows.map(r => +r[field]).filter(v => !isNaN(v))
          return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
        }
      })
    },
    {
      template: (data, field, entity) => ({
        prompt: `Which ${entity} has the highest ${field}?`,
        type: 'mcq',
        compute: (rows, nameField) => {
          const sorted = [...rows].sort((a, b) => +b[field] - +a[field])
          return { correct: sorted[0]?.[nameField], options: sorted.slice(0, 4).map(r => r[nameField]) }
        }
      })
    },
    {
      template: (data, field) => ({
        prompt: `Round the mean ${field} to the nearest whole number.`,
        compute: (rows) => {
          const vals = rows.map(r => +r[field]).filter(v => !isNaN(v))
          return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        }
      })
    }
  ],
  percentages: [
    {
      template: (data, field) => ({
        prompt: `What percentage of entries have a ${field} greater than the mean? (to 1 decimal place)`,
        compute: (rows) => {
          const vals = rows.map(r => +r[field]).filter(v => !isNaN(v))
          const mean = vals.reduce((a, b) => a + b, 0) / vals.length
          return +((vals.filter(v => v > mean).length / vals.length) * 100).toFixed(1)
        }
      })
    },
    {
      template: (data, field, entity, nameField) => ({
        prompt: `What percentage of the total ${field} does the top-ranked ${entity} contribute?`,
        compute: (rows) => {
          const vals = rows.map(r => +r[field]).filter(v => !isNaN(v))
          const total = vals.reduce((a, b) => a + b, 0)
          const max = Math.max(...vals)
          return +((max / total) * 100).toFixed(1)
        }
      })
    }
  ],
  ratios: [
    {
      template: (data, f1, f2) => ({
        prompt: `What is the ratio of mean ${f1} to mean ${f2}? Express as a decimal to 2 decimal places.`,
        compute: (rows) => {
          const avg = (field) => { const v = rows.map(r => +r[field]).filter(x => !isNaN(x)); return v.reduce((a, b) => a + b, 0) / v.length }
          return +(avg(f1) / avg(f2)).toFixed(2)
        }
      })
    }
  ],
  comparison: [
    {
      template: (data, field) => ({
        prompt: `What is the range of ${field} values (maximum minus minimum)?`,
        compute: (rows) => {
          const vals = rows.map(r => +r[field]).filter(v => !isNaN(v))
          return +(Math.max(...vals) - Math.min(...vals)).toFixed(2)
        }
      })
    },
    {
      template: (data, field) => ({
        prompt: `By how much does the maximum ${field} exceed the mean ${field}? Round to 2 decimal places.`,
        compute: (rows) => {
          const vals = rows.map(r => +r[field]).filter(v => !isNaN(v))
          const mean = vals.reduce((a, b) => a + b, 0) / vals.length
          return +(Math.max(...vals) - mean).toFixed(2)
        }
      })
    }
  ],
  probability: [
    {
      template: (data, field) => ({
        prompt: `Based on the data, what is the probability that a randomly selected entry has a ${field} above the median? Express as a fraction or decimal.`,
        compute: (rows) => {
          const vals = rows.map(r => +r[field]).filter(v => !isNaN(v)).sort((a, b) => a - b)
          const median = vals[Math.floor(vals.length / 2)]
          return +(vals.filter(v => v > median).length / vals.length).toFixed(2)
        }
      })
    }
  ],
  trends: [
    {
      template: (data, field) => ({
        prompt: `Looking at the ${field} values, is the overall trend: increasing, decreasing, or stable? (Hint: compare first half average to second half average)`,
        type: 'mcq',
        compute: (rows) => {
          const vals = rows.map(r => +r[field]).filter(v => !isNaN(v))
          const half = Math.floor(vals.length / 2)
          const firstAvg = vals.slice(0, half).reduce((a, b) => a + b, 0) / half
          const secondAvg = vals.slice(half).reduce((a, b) => a + b, 0) / (vals.length - half)
          const diff = secondAvg - firstAvg
          return diff > firstAvg * 0.05 ? 'increasing' : diff < -firstAvg * 0.05 ? 'decreasing' : 'stable'
        }
      })
    }
  ],
  range_iqr: [
    {
      template: (data, field) => ({
        prompt: `Calculate the interquartile range (IQR) of ${field}. Round to 2 decimal places.`,
        compute: (rows) => {
          const vals = rows.map(r => +r[field]).filter(v => !isNaN(v)).sort((a, b) => a - b)
          const q1 = vals[Math.floor(vals.length * 0.25)]
          const q3 = vals[Math.floor(vals.length * 0.75)]
          return +(q3 - q1).toFixed(2)
        }
      })
    }
  ]
}

async function generateQuestions({ datasetId, topic, difficulty, count }) {
  const rows = await prisma.datasetRow.findMany({ where: { datasetId }, select: { row: true }, take: 500 })
  const dataset = await prisma.dataset.findUnique({ where: { id: datasetId } })
  if (!rows.length || !dataset) throw new Error('Dataset not found or empty')

  const data = rows.map(r => r.row)
  const schema = dataset.schema
  const numericFields = schema.filter(c => c.type === 'number').map(c => c.name)
  const stringFields = schema.filter(c => c.type === 'string').map(c => c.name)

  if (!numericFields.length) throw new Error('Dataset has no numeric columns for question generation')

  const templates = TEMPLATES[topic] ?? TEMPLATES.averages
  const questions = []

  for (let i = 0; i < Math.min(count, 20); i++) {
    const template = templates[i % templates.length]
    const field = numericFields[i % numericFields.length]
    const nameField = stringFields[0] || numericFields[0]
    const entity = nameField

    try {
      const tpl = template.template(data, field, entity, nameField)
      const correctAnswer = typeof tpl.compute === 'function' ? tpl.compute(data, nameField) : tpl.compute

      const question = buildQuestion(tpl, field, correctAnswer, difficulty, topic)
      questions.push(question)
    } catch (err) {
      console.warn('Question generation skipped:', err.message)
    }
  }

  return questions
}

function buildQuestion(tpl, field, correctAnswer, difficulty, topic) {
  const isMCQ = tpl.type === 'mcq' || typeof correctAnswer === 'string'
  const isNumeric = typeof correctAnswer === 'number'

  if (isMCQ && tpl.compute) {
    const options = Array.isArray(correctAnswer.options)
      ? shuffleWithCorrect(correctAnswer.options, correctAnswer.correct)
      : generateStringOptions(correctAnswer, difficulty)
    const correctIdx = options.indexOf(correctAnswer.correct ?? correctAnswer)
    return {
      id: `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      questionType: 'mcq',
      prompt: tpl.prompt,
      options,
      correctAnswer: correctIdx >= 0 ? correctIdx : 0,
      points: difficultyPoints(difficulty),
      timeLimitSec: difficultyTime(difficulty),
      generated: true,
      generatorMeta: { topic, field },
    }
  }

  if (isNumeric) {
    if (difficulty === 'easy') {
      const options = generateNumericOptions(correctAnswer, difficulty)
      const idx = options.indexOf(correctAnswer)
      return {
        id: `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        questionType: 'mcq',
        prompt: tpl.prompt,
        options: options.map(o => String(o)),
        correctAnswer: idx >= 0 ? idx : 0,
        points: difficultyPoints(difficulty),
        timeLimitSec: difficultyTime(difficulty),
        generated: true,
        generatorMeta: { topic, field },
      }
    }
    return {
      id: `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      questionType: 'numeric',
      prompt: tpl.prompt,
      correctAnswer,
      tolerance: correctAnswer !== 0 ? Math.abs(correctAnswer * 0.01) : 0.01,
      points: difficultyPoints(difficulty),
      timeLimitSec: difficultyTime(difficulty),
      generated: true,
      generatorMeta: { topic, field },
    }
  }

  return {
    id: `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    questionType: 'mcq',
    prompt: tpl.prompt,
    options: ['increasing', 'decreasing', 'stable', 'variable'],
    correctAnswer: ['increasing', 'decreasing', 'stable', 'variable'].indexOf(correctAnswer),
    points: difficultyPoints(difficulty),
    timeLimitSec: difficultyTime(difficulty),
    generated: true,
    generatorMeta: { topic, field },
  }
}

function generateNumericOptions(correct, difficulty) {
  const spread = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.15 : 0.08
  const distractors = [
    +(correct * (1 + spread)).toFixed(2),
    +(correct * (1 - spread)).toFixed(2),
    +(correct * (1 + spread * 2)).toFixed(2),
  ]
  return shuffle([correct, ...distractors.slice(0, 3)])
}

function generateStringOptions(correct, difficulty) {
  return [correct, `Not ${correct}`, 'Cannot be determined', 'None of these']
}

function shuffleWithCorrect(arr, correct) {
  const rest = arr.filter(a => a !== correct).slice(0, 3)
  return shuffle([correct, ...rest])
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function difficultyPoints(d) { return d === 'easy' ? 1 : d === 'medium' ? 2 : 3 }
function difficultyTime(d) { return d === 'easy' ? 45 : d === 'medium' ? 30 : 20 }

module.exports = { generateQuestions }
