const { google } = require('googleapis')

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

function getAuthUrl() {
  const oauth2Client = getOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
    ],
    prompt: 'consent',
  })
}

async function exchangeCode(code) {
  const oauth2Client = getOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

async function listSheets(tokens) {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials(tokens)
  const drive = google.drive({ version: 'v3', auth: oauth2Client })
  const res = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields: 'files(id,name,modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: 30,
  })
  return res.data.files || []
}

async function importSheet(tokens, fileId, sheetName) {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials(tokens)
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client })

  // Get spreadsheet metadata to find sheet names
  const meta = await sheets.spreadsheets.get({ spreadsheetId: fileId })
  const sheetList = meta.data.sheets.map(s => s.properties.title)
  const targetSheet = sheetName || sheetList[0]

  // Get the data
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: fileId,
    range: targetSheet,
  })

  const values = res.data.values || []
  if (values.length < 2) return { rows: [], schema: [], sheetList }

  const headers = values[0]
  const dataRows = values.slice(1)

  // Auto-detect types
  const schema = headers.map((h, i) => {
    const samples = dataRows.slice(0, 20).map(r => r[i]).filter(Boolean)
    const type = samples.every(v => !isNaN(v) && v !== '') ? 'number'
      : samples.every(v => !isNaN(Date.parse(v))) ? 'date'
      : 'string'
    return { name: h, type }
  })

  const rows = dataRows.map(r => {
    const obj = {}
    headers.forEach((h, i) => {
      const val = r[i] ?? ''
      const col = schema.find(s => s.name === h)
      obj[h] = col?.type === 'number' ? (parseFloat(val) || 0) : val
    })
    return obj
  })

  return { rows, schema, sheetList }
}

module.exports = { getAuthUrl, exchangeCode, listSheets, importSheet }
