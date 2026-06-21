const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // STARTTLS for port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const FROM = process.env.EMAIL_FROM || 'MetaMaths <noreply@metamaths.app>'
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// ─── Shared HTML wrapper ───────────────────────────────────────────────────────
const wrap = (body) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width"/>
  <style>
    body { margin:0; padding:0; background:#0f172a; font-family: 'Segoe UI', Arial, sans-serif; color:#e2e8f0; }
    .container { max-width:560px; margin:40px auto; background:#1e293b; border-radius:16px; overflow:hidden; border:1px solid #334155; }
    .header { background:linear-gradient(135deg,#2563eb,#7c3aed); padding:32px 36px; }
    .header h1 { margin:0; color:#fff; font-size:22px; font-weight:700; }
    .header p { margin:4px 0 0; color:#bfdbfe; font-size:13px; }
    .body { padding:32px 36px; }
    .body p { margin:0 0 16px; font-size:15px; line-height:1.6; color:#cbd5e1; }
    .btn { display:inline-block; background:#2563eb; color:#fff!important; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:600; font-size:14px; margin:8px 0 20px; }
    .divider { border:none; border-top:1px solid #334155; margin:24px 0; }
    .footer { padding:20px 36px; background:#0f172a; font-size:12px; color:#475569; }
    .badge { display:inline-block; background:#7c3aed22; color:#a78bfa; border:1px solid #7c3aed44; border-radius:20px; padding:4px 12px; font-size:12px; font-weight:600; }
    .stat { display:inline-block; background:#1e3a5f; border-radius:8px; padding:12px 20px; margin:4px; text-align:center; }
    .stat-val { font-size:24px; font-weight:800; color:#60a5fa; }
    .stat-lbl { font-size:11px; color:#64748b; margin-top:2px; }
    .highlight { background:#1e3a5f; border-left:3px solid #2563eb; border-radius:4px; padding:12px 16px; margin:16px 0; }
  </style>
</head>
<body>
  <div class="container">
    ${body}
    <div class="footer">
      MetaMaths · University of Leicester MSc Project<br/>
      You're receiving this because you have an account on MetaMaths.<br/>
      <a href="${BASE_URL}" style="color:#3b82f6;">Visit MetaMaths</a>
    </div>
  </div>
</body>
</html>`

// ─── Email senders ─────────────────────────────────────────────────────────────

async function sendVerificationEmail(to, name, token) {
  const link = `${BASE_URL}/verify-email?token=${token}`
  await transporter.sendMail({
    from: FROM, to,
    subject: 'Verify your MetaMaths account',
    html: wrap(`
      <div class="header">
        <h1>🎮 MetaMaths</h1>
        <p>Esports Maths Learning Platform</p>
      </div>
      <div class="body">
        <p>Hi <strong style="color:#f1f5f9">${name}</strong>,</p>
        <p>Welcome to MetaMaths! Click the button below to verify your email address and activate your account.</p>
        <a href="${link}" class="btn">✅ Verify Email Address</a>
        <p style="font-size:13px;color:#64748b">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `)
  })
}

async function sendPasswordResetEmail(to, name, token) {
  const link = `${BASE_URL}/reset-password?token=${token}`
  await transporter.sendMail({
    from: FROM, to,
    subject: 'Reset your MetaMaths password',
    html: wrap(`
      <div class="header">
        <h1>🔑 Password Reset</h1>
        <p>MetaMaths Account Security</p>
      </div>
      <div class="body">
        <p>Hi <strong style="color:#f1f5f9">${name}</strong>,</p>
        <p>We received a request to reset your password. Click below to set a new one:</p>
        <a href="${link}" class="btn">🔒 Reset Password</a>
        <p style="font-size:13px;color:#64748b">This link expires in <strong>1 hour</strong>. If you didn't request a reset, please ignore this email — your account is safe.</p>
      </div>
    `)
  })
}

async function sendWelcomeEmail(to, name, role) {
  const dashLink = role === 'teacher' ? `${BASE_URL}/t/dashboard` : `${BASE_URL}/s/dashboard`
  await transporter.sendMail({
    from: FROM, to,
    subject: `Welcome to MetaMaths, ${name}! 🎮`,
    html: wrap(`
      <div class="header">
        <h1>Welcome to MetaMaths! 🎉</h1>
        <p>Teaching maths through esports data</p>
      </div>
      <div class="body">
        <p>Hi <strong style="color:#f1f5f9">${name}</strong>,</p>
        <p>Your account is now active. You've joined as a <span class="badge">${role}</span>.</p>
        ${role === 'teacher' ? `
        <div class="highlight">
          <p style="margin:0;font-size:14px;"><strong style="color:#f1f5f9">Getting started:</strong><br/>
          1. Import a dataset (OpenDota, CSV, or PandaScore)<br/>
          2. Build a chart from the data<br/>
          3. Auto-generate a quiz<br/>
          4. Create a classroom and run a live session!</p>
        </div>` : `
        <div class="highlight">
          <p style="margin:0;font-size:14px;"><strong style="color:#f1f5f9">Getting started:</strong><br/>
          Ask your teacher for a 6-character join code to join your first classroom.</p>
        </div>`}
        <a href="${dashLink}" class="btn">🚀 Go to Dashboard</a>
      </div>
    `)
  })
}

async function sendQuizAssignedEmail(to, studentName, quizTitle, classroomName, teacherName, deadline) {
  const link = `${BASE_URL}/s/classrooms`
  await transporter.sendMail({
    from: FROM, to,
    subject: `📋 New quiz assigned: ${quizTitle}`,
    html: wrap(`
      <div class="header">
        <h1>📋 New Quiz Assigned</h1>
        <p>${classroomName}</p>
      </div>
      <div class="body">
        <p>Hi <strong style="color:#f1f5f9">${studentName}</strong>,</p>
        <p><strong style="color:#f1f5f9">${teacherName}</strong> has assigned you a new quiz in <strong style="color:#f1f5f9">${classroomName}</strong>.</p>
        <div class="highlight">
          <p style="margin:0;"><strong style="color:#60a5fa">${quizTitle}</strong></p>
          ${deadline ? `<p style="margin:4px 0 0;font-size:13px;color:#f59e0b;">⏰ Due: ${new Date(deadline).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>` : ''}
        </div>
        <a href="${link}" class="btn">📝 Start Quiz</a>
      </div>
    `)
  })
}

async function sendSessionStartEmail(to, studentName, quizTitle, classroomName, joinLink) {
  await transporter.sendMail({
    from: FROM, to,
    subject: `🔴 Live session starting now — ${quizTitle}`,
    html: wrap(`
      <div class="header">
        <h1>🔴 Live Session Starting!</h1>
        <p>${classroomName}</p>
      </div>
      <div class="body">
        <p>Hi <strong style="color:#f1f5f9">${studentName}</strong>,</p>
        <p>Your teacher has started a live session in <strong style="color:#f1f5f9">${classroomName}</strong>. Join now to participate!</p>
        <div class="highlight">
          <p style="margin:0;font-size:16px;font-weight:700;color:#10b981;">● Live Now: ${quizTitle}</p>
        </div>
        <a href="${joinLink}" class="btn" style="background:#10b981;">⚡ Join Session Now</a>
        <p style="font-size:13px;color:#64748b;">Don't miss it — the session is happening right now!</p>
      </div>
    `)
  })
}

async function sendSessionResultsEmail(to, studentName, quizTitle, score, rank, totalStudents, sessionId) {
  const link = `${BASE_URL}/s/sessions/${sessionId}/review`
  const emoji = score >= 90 ? '🏆' : score >= 70 ? '🎉' : score >= 50 ? '👍' : '📚'
  const colour = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  await transporter.sendMail({
    from: FROM, to,
    subject: `${emoji} Your results: ${quizTitle} — ${score}%`,
    html: wrap(`
      <div class="header">
        <h1>${emoji} Session Complete!</h1>
        <p>${quizTitle}</p>
      </div>
      <div class="body">
        <p>Hi <strong style="color:#f1f5f9">${studentName}</strong>, here are your results:</p>
        <div style="text-align:center;margin:24px 0;">
          <div class="stat" style="min-width:120px;">
            <div class="stat-val" style="color:${colour};font-size:36px;">${score}%</div>
            <div class="stat-lbl">Your Score</div>
          </div>
          ${rank ? `<div class="stat" style="min-width:120px;">
            <div class="stat-val">#${rank}</div>
            <div class="stat-lbl">Rank of ${totalStudents}</div>
          </div>` : ''}
        </div>
        <p style="text-align:center;font-size:18px;">
          ${score >= 90 ? 'Outstanding performance! 🏆' : score >= 70 ? 'Well done! Keep it up!' : score >= 50 ? 'Good effort! Review the questions to improve.' : 'Keep practising - you will get there! 💪'}
        </p>
        <a href="${link}" class="btn" style="display:block;text-align:center;">📖 Review Your Answers</a>
      </div>
    `)
  })
}

async function sendClassroomJoinedEmail(to, teacherName, studentName, classroomName) {
  await transporter.sendMail({
    from: FROM, to,
    subject: `🎓 ${studentName} joined ${classroomName}`,
    html: wrap(`
      <div class="header">
        <h1>🎓 New Student Joined</h1>
        <p>${classroomName}</p>
      </div>
      <div class="body">
        <p>Hi <strong style="color:#f1f5f9">${teacherName}</strong>,</p>
        <p><strong style="color:#f1f5f9">${studentName}</strong> has joined your classroom <strong style="color:#60a5fa">${classroomName}</strong>.</p>
        <a href="${BASE_URL}/t/classrooms" class="btn">View Classroom</a>
      </div>
    `)
  })
}

async function sendWeakTopicAlertEmail(to, studentName, weakTopics) {
  const link = `${BASE_URL}/s/practice`
  await transporter.sendMail({
    from: FROM, to,
    subject: `📈 Topics to revise — personalised for you`,
    html: wrap(`
      <div class="header">
        <h1>📈 Personalised Revision Tips</h1>
        <p>Based on your recent sessions</p>
      </div>
      <div class="body">
        <p>Hi <strong style="color:#f1f5f9">${studentName}</strong>,</p>
        <p>Based on your recent quiz performance, here are the topics we recommend revising:</p>
        <div style="margin:16px 0;">
          ${weakTopics.map(t => `<span class="badge" style="margin:4px;">${t}</span>`).join('')}
        </div>
        <p>Use Practice Mode to generate unlimited questions on these topics and improve your understanding.</p>
        <a href="${link}" class="btn">⚡ Start Practising</a>
      </div>
    `)
  })
}

// Test the connection on startup
async function verifyConnection() {
  try {
    await transporter.verify()
    console.log('✅ Email service ready (Gmail SMTP)')
  } catch (err) {
    console.warn('⚠️  Email service not available:', err.message)
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendQuizAssignedEmail,
  sendSessionStartEmail,
  sendSessionResultsEmail,
  sendClassroomJoinedEmail,
  sendWeakTopicAlertEmail,
  verifyConnection,
}
