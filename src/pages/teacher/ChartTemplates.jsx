import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { BarChart3, TrendingUp, PieChart as PieIcon, Radar as RadarIcon, ChevronRight, Copy } from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'

const tooltipStyle = { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#e5e7eb', fontSize: '11px' }

// Pre-built chart templates with sample data
const TEMPLATES = [
  {
    id: 'hero-winrates',
    title: 'Hero Win Rate Comparison',
    description: 'Compare win rates across multiple heroes — ideal for averages lessons',
    topic: 'averages',
    chartType: 'bar',
    category: 'Averages',
    game: 'Dota 2',
    data: [
      { name: 'Lion', value: 52.1 }, { name: 'DK', value: 50.7 }, { name: 'CM', value: 49.1 },
      { name: 'Axe', value: 51.2 }, { name: 'AM', value: 47.5 }, { name: 'PA', value: 46.9 },
    ],
    color: '#3b82f6',
    xLabel: 'Hero', yLabel: 'Win Rate (%)',
  },
  {
    id: 'player-kda-trend',
    title: 'Player KDA Over Season',
    description: 'Track a player\'s KDA ratio across matches — perfect for trends lessons',
    topic: 'trends',
    chartType: 'line',
    category: 'Trends',
    game: 'LoL',
    data: [
      { name: 'M1', value: 3.2 }, { name: 'M2', value: 4.1 }, { name: 'M3', value: 2.8 },
      { name: 'M4', value: 5.3 }, { name: 'M5', value: 4.7 }, { name: 'M6', value: 6.1 },
      { name: 'M7', value: 5.8 }, { name: 'M8', value: 6.3 },
    ],
    color: '#10b981',
    xLabel: 'Match', yLabel: 'KDA',
  },
  {
    id: 'team-composition',
    title: 'Role Distribution in Team',
    description: 'Show what proportion of players fill each role — great for fractions/percentages',
    topic: 'percentages',
    chartType: 'pie',
    category: 'Percentages',
    game: 'Any',
    data: [
      { name: 'Carry / ADC', value: 1 }, { name: 'Support', value: 1 },
      { name: 'Mid Lane', value: 1 }, { name: 'Jungle', value: 1 }, { name: 'Top Lane', value: 1 },
    ],
    colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'],
    xLabel: 'Role', yLabel: 'Count',
  },
  {
    id: 'headshot-pct',
    title: 'CS2 Headshot Percentages',
    description: 'Compare headshot % across pro players — percentages and comparison',
    topic: 'percentages',
    chartType: 'bar',
    category: 'Percentages',
    game: 'CS2',
    data: [
      { name: 's1mple', value: 52.3 }, { name: 'ZywOo', value: 48.7 }, { name: 'NiKo', value: 54.1 },
      { name: 'device', value: 41.2 }, { name: 'Broky', value: 46.8 }, { name: 'ropz', value: 44.5 },
    ],
    color: '#ef4444',
    xLabel: 'Player', yLabel: 'Headshot %',
  },
  {
    id: 'damage-spread',
    title: 'Player Damage per Match',
    description: 'Show damage variation across 12 matches — excellent for range and IQR',
    topic: 'range_iqr',
    chartType: 'bar',
    category: 'Range / IQR',
    game: 'Valorant',
    data: [
      { name: 'M1', value: 2840 }, { name: 'M2', value: 3120 }, { name: 'M3', value: 1890 },
      { name: 'M4', value: 3450 }, { name: 'M5', value: 2670 }, { name: 'M6', value: 4210 },
      { name: 'M7', value: 2980 }, { name: 'M8', value: 3310 }, { name: 'M9', value: 2540 },
      { name: 'M10', value: 3090 }, { name: 'M11', value: 1650 }, { name: 'M12', value: 3780 },
    ],
    color: '#f59e0b',
    xLabel: 'Match', yLabel: 'Damage Dealt',
  },
  {
    id: 'team-stats-radar',
    title: 'Team Stats Radar',
    description: 'Visualise a team\'s strengths and weaknesses across multiple stats',
    topic: 'comparison',
    chartType: 'radar',
    category: 'Comparison',
    game: 'LoL',
    data: [
      { stat: 'KDA', value: 76 }, { stat: 'Vision', value: 82 },
      { stat: 'Gold/Min', value: 68 }, { stat: 'Win Rate', value: 71 },
      { stat: 'Dragons', value: 88 }, { stat: 'Objectives', value: 74 },
    ],
    color: '#06b6d4',
    xLabel: 'Stat', yLabel: 'Score',
  },
  {
    id: 'win-rate-by-economy',
    title: 'Win Rate by Economy Type',
    description: 'Compare round win rates by economic situation — ratios and comparison',
    topic: 'comparison',
    chartType: 'bar',
    category: 'Comparison',
    game: 'CS2',
    data: [
      { name: 'Full Buy', value: 73 }, { name: 'Pistol', value: 58 },
      { name: 'Force', value: 42 }, { name: 'Eco', value: 18 },
      { name: 'Anti-eco', value: 81 },
    ],
    color: '#8b5cf6',
    xLabel: 'Round Type', yLabel: 'Win Rate (%)',
  },
  {
    id: 'match-outcomes',
    title: 'Match Outcome History',
    description: 'Show wins and losses over time — relative frequency and probability',
    topic: 'probability',
    chartType: 'line',
    category: 'Probability',
    game: 'Any',
    data: [
      { name: 'W1', value: 1 }, { name: 'W2', value: 2 }, { name: 'W3', value: 2 },
      { name: 'W4', value: 3 }, { name: 'W5', value: 4 }, { name: 'W6', value: 4 },
      { name: 'W7', value: 5 }, { name: 'W8', value: 6 }, { name: 'W9', value: 7 }, { name: 'W10', value: 7 },
    ],
    color: '#10b981',
    xLabel: 'Week', yLabel: 'Cumulative Wins',
  },
]

const CATEGORIES = ['All', 'Averages', 'Percentages', 'Trends', 'Comparison', 'Range / IQR', 'Probability']

function MiniChart({ tpl }) {
  if (tpl.chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie data={tpl.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55}>
            {tpl.data.map((_, i) => <Cell key={i} fill={(tpl.colors ?? ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444'])[i % 5]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    )
  }
  if (tpl.chartType === 'radar') {
    return (
      <ResponsiveContainer width="100%" height={140}>
        <RadarChart data={tpl.data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="stat" tick={{ fontSize: 9, fill: '#6b7280' }} />
          <Radar dataKey="value" stroke={tpl.color} fill={tpl.color} fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
    )
  }
  if (tpl.chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={tpl.data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="value" stroke={tpl.color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={tpl.data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} />
        <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" fill={tpl.color} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

const categoryColors = {
  'Averages': 'badge-blue', 'Percentages': 'badge-purple', 'Trends': 'badge-green',
  'Comparison': 'badge-yellow', 'Range / IQR': 'badge-red', 'Probability': 'badge-gray'
}

export default function ChartTemplates() {
  const { toast } = useUIStore()
  const [category, setCategory] = useState('All')

  const filtered = TEMPLATES.filter(t => category === 'All' || t.category === category)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Chart Templates</h1>
          <p className="text-sm text-gray-400 mt-1">
            Pre-built esports visualisations for each maths topic. Open a lesson to see these charts in context.
          </p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${category === c ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(tpl => (
          <div key={tpl.id} className="card hover:border-gray-700 transition-all group">
            {/* Mini chart preview */}
            <div className="bg-gray-800/50 rounded-xl p-3 mb-4">
              <MiniChart tpl={tpl} />
            </div>

            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-white">{tpl.title}</h3>
              <span className={`badge text-xs flex-shrink-0 ${categoryColors[tpl.category] ?? 'badge-gray'}`}>{tpl.category}</span>
            </div>

            <p className="text-xs text-gray-400 mb-3">{tpl.description}</p>

            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>🎮 {tpl.game}</span>
              <span className="capitalize">{tpl.chartType} chart</span>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
              <Link to={`/t/lessons/${tpl.topic}`}
                className="btn-ghost text-xs flex items-center gap-1 flex-1 justify-center">
                Open Lesson <ChevronRight size={11} />
              </Link>
              <Link to={`/t/charts/builder?topic=${tpl.topic}`}
                className="btn-primary text-xs flex items-center gap-1 flex-1 justify-center">
                Build Chart
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
