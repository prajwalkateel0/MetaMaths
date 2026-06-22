import React from 'react'
import { Link } from 'react-router-dom'
import { Gamepad2, BarChart3, Brain, Users, Zap, Trophy, ArrowRight, CheckCircle } from 'lucide-react'

const features = [
  { icon: BarChart3, title: 'Interactive Charts', desc: 'Build bar, line, pie and scatter charts from real esports data in minutes.' },
  { icon: Brain, title: 'Smart Quiz Generator', desc: 'Auto-generate maths questions on averages, percentages, ratios and more.' },
  { icon: Users, title: 'Live Classroom Sessions', desc: 'Run real-time quiz sessions for 30+ students with live leaderboards.' },
  { icon: Zap, title: 'Esports Data APIs', desc: 'Connect to OpenDota, Riot Games, PandaScore for fresh, engaging data.' },
  { icon: Trophy, title: 'Gamified Learning', desc: 'Students earn XP, badges and compete on leaderboards to stay motivated.' },
  { icon: Gamepad2, title: 'No Raw Data Exposure', desc: 'Students see charts and questions — never raw spreadsheet data.' },
]

const apis = ['OpenDota (Dota 2)', 'Riot Games (LoL)', 'PandaScore (CS2/Valorant)', 'CSV Upload', 'Google Drive']

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg esport-gradient flex items-center justify-center">
            <Gamepad2 size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white">MetaMaths</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm px-4 py-2">Login</Link>
          <Link to="/register" className="btn-primary text-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
          Teach Maths Through <span className="esport-text">Esports Data</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          A controlled classroom platform that turns League of Legends KDA, Dota 2 GPM,
          and CS2 stats into engaging maths lessons for secondary school students.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register" className="btn-lg esport-gradient text-white font-semibold rounded-xl px-8 hover:opacity-90 transition-opacity">
            Start Teaching <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="btn-lg btn-outline rounded-xl px-8">
            Sign In
          </Link>
        </div>
      </section>

      {/* Data sources strip */}
      <div className="border-y border-gray-800 bg-gray-900/50 py-4">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
          <span className="font-medium text-gray-400">Data from:</span>
          {apis.map((a) => (
            <span key={a} className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-green-500" /> {a}
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center text-white mb-4">Everything a teacher needs</h2>
        <p className="text-gray-400 text-center mb-12">From dataset import to live session leaderboards — in one platform.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card hover:border-gray-700 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4 group-hover:bg-primary-500/20 transition-colors">
                <Icon size={20} className="text-primary-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Maths topics */}
      <section className="bg-gray-900/50 border-y border-gray-800 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Auto-generated maths questions</h2>
          <p className="text-gray-400 mb-10">Our engine turns esports stats into curriculum-aligned questions across 6+ maths topics.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Averages & Mean', 'Percentages', 'Ratios & KDA', 'Probability', 'Linear Trends', 'Comparison', 'Range & IQR', 'Distribution'].map((t) => (
              <span key={t} className="badge-blue text-sm px-3 py-1">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to engage your class?</h2>
        <p className="text-gray-400 mb-8">Register as a teacher and run your first data-driven lesson in under 10 minutes.</p>
        <Link to="/register" className="btn-lg esport-gradient text-white font-semibold rounded-xl px-10 hover:opacity-90 transition-opacity">
          Create Free Account <ArrowRight size={18} />
        </Link>
      </section>

      <footer className="border-t border-gray-800 py-6 text-center text-sm text-gray-600">
        MetaMaths — MSc Dissertation · University of Leicester · Supervisor: J Drake
      </footer>
    </div>
  )
}
