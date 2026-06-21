const express = require('express')
const multer = require('multer')
const { asyncHandler } = require('../../middleware/errorHandler')
const { authMiddleware } = require('../../middleware/auth')
const { requireTeacher } = require('../../middleware/rbac')
const { PrismaClient } = require('@prisma/client')
const Papa = require('papaparse')
const fetch = require('node-fetch')
const gdrive = require('../../integrations/google-drive')

const router = express.Router()
const prisma = new PrismaClient()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.use(authMiddleware)

// List datasets
router.get('/', asyncHandler(async (req, res) => {
  const datasets = await prisma.dataset.findMany({
    where: { ownerId: req.user.sub },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, description: true, sourceType: true, rowCount: true, schema: true, tags: true, refreshedAt: true, createdAt: true }
  })
  res.json(datasets)
}))

// Get one dataset
router.get('/:id', asyncHandler(async (req, res) => {
  const ds = await prisma.dataset.findUnique({ where: { id: req.params.id } })
  if (!ds || ds.ownerId !== req.user.sub) return res.status(404).json({ detail: 'Not found' })
  res.json(ds)
}))

// Get rows (teacher/admin only — allow any teacher to view for chart building)
router.get('/:id/rows', requireTeacher, asyncHandler(async (req, res) => {
  const ds = await prisma.dataset.findUnique({ where: { id: req.params.id } })
  if (!ds) return res.status(404).json({ detail: 'Not found' })
  // Allow owner OR admin to see rows; other teachers see public datasets
  if (ds.ownerId !== req.user.sub && req.user.role !== 'admin' && !ds.isPublic) {
    return res.status(403).json({ detail: 'Not authorised to view this dataset' })
  }
  const limit = Math.min(parseInt(req.query.limit ?? '50'), 200)
  const offset = parseInt(req.query.offset ?? '0')
  const [rows, total] = await Promise.all([
    prisma.datasetRow.findMany({ where: { datasetId: req.params.id }, skip: offset, take: limit, orderBy: { rowIndex: 'asc' } }),
    prisma.datasetRow.count({ where: { datasetId: req.params.id } })
  ])
  res.json({ rows, total })
}))

// Quick preview — 8 rows for chart builder sidebar (no pagination needed)
router.get('/:id/preview-rows', authMiddleware, asyncHandler(async (req, res) => {
  const ds = await prisma.dataset.findUnique({ where: { id: req.params.id } })
  if (!ds) return res.status(404).json({ detail: 'Not found' })
  const rows = await prisma.datasetRow.findMany({
    where: { datasetId: req.params.id }, take: 8, orderBy: { rowIndex: 'asc' }, select: { row: true }
  })
  res.json({ rows: rows.map(r => r.row), schema: ds.schema, total: ds.rowCount ?? 0 })
}))

// Upload CSV
router.post('/upload', requireTeacher, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'No file provided' })
  const csv = req.file.buffer.toString('utf8')
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true, dynamicTyping: true })
  if (parsed.errors.length > 0) return res.status(400).json({ detail: 'Invalid CSV', errors: parsed.errors })

  const rows = parsed.data.slice(0, 100000)
  const schema = detectSchema(rows)

  const dataset = await prisma.dataset.create({
    data: { ownerId: req.user.sub, title: req.body.title || req.file.originalname, description: req.body.description, sourceType: 'csv_upload', schema, rowCount: rows.length, refreshedAt: new Date() }
  })

  // Batch insert rows
  const chunks = chunkArray(rows.map((row, i) => ({ datasetId: dataset.id, row, rowIndex: i })), 1000)
  for (const chunk of chunks) await prisma.datasetRow.createMany({ data: chunk })

  res.status(201).json(dataset)
}))

// Import from API
router.post('/import/api', requireTeacher, asyncHandler(async (req, res) => {
  const { source, params, title, description } = req.body
  let rows = [], schema = []

  if (source === 'api_opendota') {
    const data = await fetchOpenDota(params)
    rows = data.rows; schema = data.schema
  } else if (source === 'api_pandascore') {
    const data = await fetchPandaScore(params)
    rows = data.rows; schema = data.schema
  } else if (source === 'api_riot') {
    const data = await fetchRiot(params)
    rows = data.rows; schema = data.schema
  } else {
    return res.status(400).json({ detail: `Unsupported source: ${source}` })
  }

  if (!rows.length) return res.status(400).json({ detail: 'No data returned from API. Check your query parameters.' })

  const dataset = await prisma.dataset.create({
    data: { ownerId: req.user.sub, title: title || `${source} import`, description, sourceType: source, schema, sourceMetadata: params, rowCount: rows.length, refreshedAt: new Date() }
  })

  try {
    const chunks = chunkArray(rows.map((row, i) => ({ datasetId: dataset.id, row, rowIndex: i })), 500)
    for (const chunk of chunks) {
      await prisma.datasetRow.createMany({ data: chunk, skipDuplicates: true })
    }
  } catch (err) {
    console.error('[import] createMany error:', err.message)
    // Dataset record is created — rows failed; user can refresh to retry
  }

  res.status(201).json(dataset)
}))

// ─── Google Drive OAuth ────────────────────────────────────────────────────────

// Step 1: Get OAuth URL (frontend opens this in a popup)
router.get('/gdrive/auth-url', authMiddleware, requireTeacher, asyncHandler(async (req, res) => {
  const url = gdrive.getAuthUrl()
  res.json({ url })
}))

// Step 2: OAuth callback — Google redirects here after user grants access
router.get('/import/gdrive/callback', asyncHandler(async (req, res) => {
  const { code, state } = req.query
  if (!code) return res.status(400).send('Missing code')
  try {
    const tokens = await gdrive.exchangeCode(code)
    // Pass tokens back to the opener window via postMessage
    res.send(`
      <script>
        window.opener.postMessage({ type: 'gdrive-auth-success', tokens: ${JSON.stringify(tokens)} }, '${process.env.FRONTEND_URL}');
        window.close();
      </script>
      <p>Connected! You can close this window.</p>
    `)
  } catch (err) {
    res.send(`<script>window.opener.postMessage({ type: 'gdrive-auth-error', error: '${err.message}' }, '${process.env.FRONTEND_URL}'); window.close();</script>`)
  }
}))

// Step 3: List user's Google Sheets
router.post('/gdrive/sheets', authMiddleware, requireTeacher, asyncHandler(async (req, res) => {
  const { tokens } = req.body
  if (!tokens) return res.status(400).json({ detail: 'tokens required' })
  const sheets = await gdrive.listSheets(tokens)
  res.json({ sheets })
}))

// Step 4: Import a specific sheet
router.post('/import/gdrive', authMiddleware, requireTeacher, asyncHandler(async (req, res) => {
  const { tokens, fileId, sheetName, title, description } = req.body
  if (!tokens || !fileId) return res.status(400).json({ detail: 'tokens and fileId required' })

  const { rows, schema, sheetList } = await gdrive.importSheet(tokens, fileId, sheetName)
  if (!rows.length) return res.status(400).json({ detail: 'Sheet is empty or has no data rows' })

  const dataset = await prisma.dataset.create({
    data: {
      ownerId: req.user.sub, title: title || 'Google Sheets Import',
      description, sourceType: 'google_drive',
      sourceMetadata: { fileId, sheetName: sheetName || sheetList[0] },
      schema, rowCount: rows.length, refreshedAt: new Date()
    }
  })
  const chunks = chunkArray(rows.map((row, i) => ({ datasetId: dataset.id, row, rowIndex: i })), 1000)
  for (const chunk of chunks) await prisma.datasetRow.createMany({ data: chunk })

  res.status(201).json({ ...dataset, sheetList })
}))

// Refresh dataset — re-fetches and restores rows from source API
router.post('/:id/refresh', requireTeacher, asyncHandler(async (req, res) => {
  const ds = await prisma.dataset.findUnique({ where: { id: req.params.id } })
  if (!ds) return res.status(404).json({ detail: 'Not found' })

  const existingCount = await prisma.datasetRow.count({ where: { datasetId: ds.id } })
  let newRows = [], newSchema = ds.schema

  try {
    if (ds.sourceType === 'api_opendota') {
      const d = await fetchOpenDota(ds.sourceMetadata || {})
      newRows = d.rows; newSchema = d.schema
    } else if (ds.sourceType === 'api_pandascore') {
      const d = await fetchPandaScore(ds.sourceMetadata || {})
      newRows = d.rows; newSchema = d.schema
    } else if (ds.sourceType === 'api_riot') {
      const d = await fetchRiot(ds.sourceMetadata || {})
      newRows = d.rows; newSchema = d.schema
    }
  } catch (err) {
    console.error('[refresh] fetch error:', err.message)
  }

  if (newRows.length > 0) {
    await prisma.datasetRow.deleteMany({ where: { datasetId: ds.id } })
    const chunks = chunkArray(newRows.map((row, i) => ({ datasetId: ds.id, row, rowIndex: i })), 1000)
    for (const chunk of chunks) await prisma.datasetRow.createMany({ data: chunk })
    await prisma.dataset.update({ where: { id: ds.id }, data: { schema: newSchema, rowCount: newRows.length, refreshedAt: new Date() } })
    return res.json({ message: `Refreshed — ${newRows.length} rows restored`, rowCount: newRows.length })
  }

  await prisma.dataset.update({ where: { id: ds.id }, data: { refreshedAt: new Date() } })
  res.json({ message: existingCount > 0 ? 'Dataset refreshed' : 'No new data available from source', rowCount: existingCount })
}))

// Delete dataset
router.delete('/:id', requireTeacher, asyncHandler(async (req, res) => {
  const ds = await prisma.dataset.findUnique({ where: { id: req.params.id } })
  if (!ds || ds.ownerId !== req.user.sub) return res.status(404).json({ detail: 'Not found' })
  await prisma.dataset.delete({ where: { id: req.params.id } })
  res.status(204).end()
}))

// Aggregate for charts
router.get('/:id/aggregate', asyncHandler(async (req, res) => {
  const { op = 'avg', field, groupBy } = req.query
  const ds = await prisma.dataset.findUnique({ where: { id: req.params.id } })
  if (!ds || ds.ownerId !== req.user.sub) return res.status(404).json({ detail: 'Not found' })

  const rows = await prisma.datasetRow.findMany({ where: { datasetId: req.params.id }, select: { row: true } })
  const data = rows.map(r => r.row)
  const result = aggregate(data, op, field, groupBy)
  res.json(result)
}))

function detectSchema(rows) {
  if (!rows.length) return []
  return Object.keys(rows[0]).map(name => {
    const vals = rows.slice(0, 100).map(r => r[name]).filter(v => v !== null && v !== undefined && v !== '')
    const type = vals.every(v => typeof v === 'number') ? 'number'
      : vals.every(v => !isNaN(Date.parse(v))) ? 'date'
      : vals.every(v => v === true || v === false || v === 'true' || v === 'false') ? 'boolean'
      : 'string'
    return { name, type }
  })
}

function aggregate(data, op, field, groupBy) {
  if (!field) return []
  if (!groupBy) {
    const vals = data.map(r => +r[field]).filter(v => !isNaN(v))
    let result
    switch (op) {
      case 'sum': result = vals.reduce((a, b) => a + b, 0); break
      case 'min': result = Math.min(...vals); break
      case 'max': result = Math.max(...vals); break
      case 'count': result = vals.length; break
      default: result = vals.reduce((a, b) => a + b, 0) / vals.length
    }
    return [{ x: field, y: result }]
  }
  const groups = {}
  data.forEach(r => {
    const key = r[groupBy]
    if (!groups[key]) groups[key] = []
    const v = +r[field]
    if (!isNaN(v)) groups[key].push(v)
  })
  return Object.entries(groups).map(([key, vals]) => ({
    x: key,
    y: op === 'sum' ? vals.reduce((a, b) => a + b, 0)
      : op === 'min' ? Math.min(...vals)
      : op === 'max' ? Math.max(...vals)
      : op === 'count' ? vals.length
      : vals.reduce((a, b) => a + b, 0) / vals.length
  }))
}

// ─── OpenDota — fully free, no API key required ───────────────────────────────
async function fetchOpenDota(params) {
  const { queryType = 'heroStats', playerId, limit = 50 } = params || {}
  // Optionally append key for higher rate limits if set
  const keyParam = process.env.OPENDOTA_API_KEY ? `?api_key=${process.env.OPENDOTA_API_KEY}` : ''

  let rows = [], schema = []

  if (queryType === 'heroStats') {
    const r = await fetch(`https://api.opendota.com/api/heroStats${keyParam}`)
    const data = await r.json()
    rows = data.slice(0, 120).map(h => ({
      id: h.id, name: h.localized_name, primary_attr: h.primary_attr,
      attack_type: h.attack_type, roles: (h.roles || []).join(', '),
      base_attack_min: h.base_attack_min, base_attack_max: h.base_attack_max,
      base_armor: h.base_armor, move_speed: h.move_speed,
      pro_win: h.pro_win, pro_pick: h.pro_pick,
      win_rate: h.pro_pick ? +(h.pro_win / h.pro_pick * 100).toFixed(1) : 0,
    }))
    schema = [
      { name: 'id', type: 'number' }, { name: 'name', type: 'string' },
      { name: 'primary_attr', type: 'string' }, { name: 'attack_type', type: 'string' },
      { name: 'roles', type: 'string' }, { name: 'base_attack_min', type: 'number' },
      { name: 'base_attack_max', type: 'number' }, { name: 'base_armor', type: 'number' },
      { name: 'move_speed', type: 'number' }, { name: 'pro_win', type: 'number' },
      { name: 'pro_pick', type: 'number' }, { name: 'win_rate', type: 'number' },
    ]
  } else if (queryType === 'proMatches') {
    const r = await fetch(`https://api.opendota.com/api/proMatches${keyParam}`)
    const data = await r.json()
    rows = data.slice(0, parseInt(limit)).map(m => ({
      match_id: m.match_id, duration_min: +(m.duration / 60).toFixed(1),
      radiant_name: m.radiant_name || 'Radiant', dire_name: m.dire_name || 'Dire',
      radiant_win: m.radiant_win ? 1 : 0, league_name: m.league?.name || '',
      start_time: new Date(m.start_time * 1000).toISOString().slice(0, 10),
    }))
    schema = [
      { name: 'match_id', type: 'number' }, { name: 'duration_min', type: 'number' },
      { name: 'radiant_name', type: 'string' }, { name: 'dire_name', type: 'string' },
      { name: 'radiant_win', type: 'number' }, { name: 'league_name', type: 'string' },
      { name: 'start_time', type: 'date' },
    ]
  } else if (queryType === 'proPlayers') {
    const r = await fetch(`https://api.opendota.com/api/proPlayers${keyParam}`)
    const data = await r.json()
    rows = data.slice(0, parseInt(limit)).map(p => ({
      account_id: p.account_id, name: p.name || p.personaname,
      team_name: p.team_name || '', country_code: p.country_code || '',
      wins: p.win || 0, losses: p.lose || 0,
      win_rate: (p.win && p.lose) ? +((p.win / (p.win + p.lose)) * 100).toFixed(1) : 0,
    }))
    schema = [
      { name: 'account_id', type: 'number' }, { name: 'name', type: 'string' },
      { name: 'team_name', type: 'string' }, { name: 'country_code', type: 'string' },
      { name: 'wins', type: 'number' }, { name: 'losses', type: 'number' },
      { name: 'win_rate', type: 'number' },
    ]
  } else if (queryType === 'player' && playerId) {
    const r = await fetch(`https://api.opendota.com/api/players/${playerId}/recentMatches${keyParam ? keyParam + '&' : '?'}limit=${limit}`)
    const data = await r.json()
    rows = data.map(m => ({
      match_id: m.match_id, kills: m.kills, deaths: m.deaths, assists: m.assists,
      kda: m.deaths ? +((m.kills + m.assists) / m.deaths).toFixed(2) : m.kills + m.assists,
      gold_per_min: m.gold_per_min, xp_per_min: m.xp_per_min,
      hero_damage: m.hero_damage, tower_damage: m.tower_damage,
      duration_min: +(m.duration / 60).toFixed(1), win: m.win ? 1 : 0,
    }))
    schema = [
      { name: 'match_id', type: 'number' }, { name: 'kills', type: 'number' },
      { name: 'deaths', type: 'number' }, { name: 'assists', type: 'number' },
      { name: 'kda', type: 'number' }, { name: 'gold_per_min', type: 'number' },
      { name: 'xp_per_min', type: 'number' }, { name: 'hero_damage', type: 'number' },
      { name: 'tower_damage', type: 'number' }, { name: 'duration_min', type: 'number' },
      { name: 'win', type: 'number' },
    ]
  }
  return { rows, schema }
}

// ─── PandaScore — Bearer token auth ───────────────────────────────────────────
async function fetchPandaScore(params) {
  const { game = 'lol', dataType = 'teams', limit = 50 } = params || {}
  const key = process.env.PANDASCORE_API_KEY
  if (!key) throw new Error('PANDASCORE_API_KEY not set in server/.env')
  const headers = { Authorization: `Bearer ${key}`, Accept: 'application/json' }

  let endpoint, rows = [], schema = []

  if (dataType === 'teams') {
    endpoint = `https://api.pandascore.co/${game}/teams?per_page=${limit}`
    const r = await fetch(endpoint, { headers })
    const data = await r.json()
    if (!Array.isArray(data)) throw new Error(data?.error || 'PandaScore API error')
    rows = data.map(t => ({
      id: t.id, name: t.name, acronym: t.acronym || '',
      location: t.location || '', wins: t.current_videogame?.name || '',
    }))
    schema = [
      { name: 'id', type: 'number' }, { name: 'name', type: 'string' },
      { name: 'acronym', type: 'string' }, { name: 'location', type: 'string' },
    ]
  } else if (dataType === 'players') {
    endpoint = `https://api.pandascore.co/${game}/players?per_page=${limit}&sort=-modified_at`
    const r = await fetch(endpoint, { headers })
    const data = await r.json()
    if (!Array.isArray(data)) throw new Error(data?.error || 'PandaScore API error')
    rows = data.map(p => ({
      id: p.id, name: p.name, first_name: p.first_name || '',
      last_name: p.last_name || '', nationality: p.nationality || '',
      team: p.current_team?.name || '', role: p.role || '',
    }))
    schema = [
      { name: 'id', type: 'number' }, { name: 'name', type: 'string' },
      { name: 'first_name', type: 'string' }, { name: 'last_name', type: 'string' },
      { name: 'nationality', type: 'string' }, { name: 'team', type: 'string' },
      { name: 'role', type: 'string' },
    ]
  } else if (dataType === 'tournaments') {
    endpoint = `https://api.pandascore.co/${game}/tournaments?per_page=${limit}&sort=-modified_at`
    const r = await fetch(endpoint, { headers })
    const data = await r.json()
    if (!Array.isArray(data)) throw new Error(data?.error || 'PandaScore API error')
    rows = data.map(t => ({
      id: t.id, name: t.name, full_name: t.full_name || '',
      league: t.league?.name || '', country: t.country || '',
      prize_pool: t.prizepool || '', begin_at: t.begin_at?.slice(0, 10) || '',
      end_at: t.end_at?.slice(0, 10) || '',
    }))
    schema = [
      { name: 'id', type: 'number' }, { name: 'name', type: 'string' },
      { name: 'full_name', type: 'string' }, { name: 'league', type: 'string' },
      { name: 'country', type: 'string' }, { name: 'prize_pool', type: 'string' },
      { name: 'begin_at', type: 'date' }, { name: 'end_at', type: 'date' },
    ]
  } else if (dataType === 'matches') {
    endpoint = `https://api.pandascore.co/${game}/matches/past?per_page=${limit}&sort=-begin_at`
    const r = await fetch(endpoint, { headers })
    const data = await r.json()
    if (!Array.isArray(data)) throw new Error(data?.error || 'PandaScore API error')
    rows = data.map(m => ({
      id: m.id, name: m.name || '', status: m.status,
      team1: m.opponents?.[0]?.opponent?.name || '',
      team2: m.opponents?.[1]?.opponent?.name || '',
      winner: m.winner?.name || '', tournament: m.tournament?.name || '',
      begin_at: m.begin_at?.slice(0, 10) || '',
    }))
    schema = [
      { name: 'id', type: 'number' }, { name: 'name', type: 'string' },
      { name: 'status', type: 'string' }, { name: 'team1', type: 'string' },
      { name: 'team2', type: 'string' }, { name: 'winner', type: 'string' },
      { name: 'tournament', type: 'string' }, { name: 'begin_at', type: 'date' },
    ]
  }
  return { rows, schema }
}

// ─── Riot Games API ───────────────────────────────────────────────────────────
async function fetchRiot(params) {
  const key = process.env.RIOT_API_KEY
  if (!key) throw new Error('RIOT_API_KEY not set in server/.env')
  const headers = { 'X-Riot-Token': key }
  const { queryType = 'champions', region = 'euw1', summonerName, limit = 50 } = params || {}
  const maxRows = parseInt(limit) || 50

  let rows = [], schema = []

  if (queryType === 'champions') {
    // Use Data Dragon — free, no rate limits, always works with any Riot key
    const versionR = await fetch('https://ddragon.leagueoflegends.com/api/versions.json')
    const versions = await versionR.json()
    const latestVersion = versions[0]
    const r = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`)
    const data = await r.json()
    const champs = Object.values(data.data).slice(0, maxRows)
    rows = champs.map(c => ({
      id: parseInt(c.key), name: c.name, title: c.title,
      class: c.tags?.join(', ') || '',
      hp: c.stats.hp, armor: c.stats.armor,
      attack_damage: c.stats.attackdamage, move_speed: c.stats.movespeed,
      hp_per_level: c.stats.hpperlevel, armor_per_level: c.stats.armorperlevel,
    }))
    schema = [
      { name: 'id', type: 'number' }, { name: 'name', type: 'string' },
      { name: 'title', type: 'string' }, { name: 'class', type: 'string' },
      { name: 'hp', type: 'number' }, { name: 'armor', type: 'number' },
      { name: 'attack_damage', type: 'number' }, { name: 'move_speed', type: 'number' },
      { name: 'hp_per_level', type: 'number' }, { name: 'armor_per_level', type: 'number' },
    ]
  } else if (queryType === 'summoner' && summonerName) {
    // Look up summoner by name
    const enc = encodeURIComponent(summonerName)
    const sumR = await fetch(`https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${enc}`, { headers })
    if (!sumR.ok) throw new Error(`Summoner not found: ${summonerName}`)
    const summoner = await sumR.json()
    const matchR = await fetch(`https://${region === 'euw1' ? 'europe' : 'americas'}.api.riotgames.com/lol/match/v5/matches/by-puuid/${summoner.puuid}/ids?count=20`, { headers })
    const matchIds = await matchR.json()
    rows = [{ summoner_id: summoner.id, name: summoner.name, level: summoner.summonerLevel, recent_matches: matchIds.length }]
    schema = [{ name: 'summoner_id', type: 'string' }, { name: 'name', type: 'string' }, { name: 'level', type: 'number' }, { name: 'recent_matches', type: 'number' }]
  }
  return { rows, schema }
}

function chunkArray(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

module.exports = router
