import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  BarChart3, Save, Sparkles, Lightbulb, BookOpen,
  MessageSquare, GraduationCap, TrendingUp, ChevronDown, ChevronUp,
  Table, Wand2, Hash, Type, Calendar
} from 'lucide-react'
import api from '../../lib/api'
import { useUIStore } from '../../store/uiStore'
import ChartRenderer from '../../features/charts/ChartRenderer'
import Spinner from '../../components/ui/Spinner'

const CHART_TYPES = ['bar', 'line', 'pie', 'scatter', 'area', 'radar']
const AGGREGATIONS = ['none', 'sum', 'avg', 'min', 'max', 'count']
const COLOR_PALETTES = {
  default: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'],
  esport:  ['#7c3aed', '#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
  pastel:  ['#93c5fd', '#c4b5fd', '#6ee7b7', '#fde68a', '#fca5a5', '#67e8f9'],
}

const TOPIC_COLORS = {
  'Averages': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'Percentages': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'Ratios': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Probability': 'text-green-400 bg-green-500/10 border-green-500/20',
  'Trends': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'Comparison': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  'Range & IQR': 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'Averages & Comparison': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
}

export default function ChartBuilder() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useUIStore()
  const [leftTab, setLeftTab] = useState('data')
  const [rightTab, setRightTab] = useState('insights')
  const [explanation, setExplanation] = useState(null)
  const [loadingExplanation, setLoadingExplanation] = useState(false)
  const [expandedQ, setExpandedQ] = useState(null)

  const [config, setConfig] = useState({
    title: 'My Chart',
    chartType: 'bar',
    datasetId: searchParams.get('datasetId') ?? '',
    xField: '',
    yField: '',
    seriesField: '',
    aggregation: 'none',
    colorPalette: 'default',
    showLegend: true,
    showGrid: true,
    xLabel: '',
    yLabel: '',
    description: '',
  })

  const { data: datasets = [] } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => api.get('/datasets').then(r => r.data),
  })

  const { data: selectedDataset } = useQuery({
    queryKey: ['dataset', config.datasetId],
    queryFn: () => api.get(`/datasets/${config.datasetId}`).then(r => r.data),
    enabled: !!config.datasetId,
  })

  // Quick preview rows for the inline table
  const { data: previewData } = useQuery({
    queryKey: ['dataset-preview', config.datasetId],
    queryFn: () => api.get(`/datasets/${config.datasetId}/preview-rows`).then(r => r.data),
    enabled: !!config.datasetId,
    staleTime: 60_000,
  })

  // Axis suggestions based on column types
  const schema = selectedDataset?.schema ?? []
  const numericCols = schema.filter(c => c.type === 'number')
  const stringCols = schema.filter(c => c.type === 'string')
  const dateCols = schema.filter(c => c.type === 'date')
  const suggestedX = stringCols[0] || dateCols[0] || schema[0]
  const suggestedY = numericCols[0]
  const [showPreviewTable, setShowPreviewTable] = useState(false)

  const { data: chartData } = useQuery({
    queryKey: ['chart-preview', config.datasetId, config.xField, config.yField, config.aggregation, config.seriesField],
    queryFn: () => api.post('/charts/preview', config).then(r => r.data),
    enabled: !!(config.datasetId && config.xField && config.yField),
    staleTime: 5000,
  })

  const { data: existingChart } = useQuery({
    queryKey: ['chart', id],
    queryFn: () => api.get(`/charts/${id}`).then(r => r.data),
    enabled: !!id,
  })

  useEffect(() => {
    if (existingChart) {
      setConfig(c => ({ ...c, ...existingChart.config, title: existingChart.title }))
      if (existingChart.annotations?.explanation) setExplanation(existingChart.annotations.explanation)
    }
  }, [existingChart])

  // Auto-generate explanation when chart data is ready
  useEffect(() => {
    if (chartData?.length >= 2 && config.xField && config.yField && !explanation) {
      generateExplanation()
    }
  }, [chartData?.length, config.xField, config.yField])

  const generateExplanation = async () => {
    if (!chartData?.length) return
    setLoadingExplanation(true)
    try {
      const datasetTitle = datasets.find(d => d.id === config.datasetId)?.title
      const { data } = await api.post('/charts/explain', { chartData, config, datasetTitle })
      setExplanation(data)
      setRightTab('insights')
    } catch {
      toast.error('Could not generate explanation')
    } finally {
      setLoadingExplanation(false)
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: config.title,
        config,
        annotations: explanation ? { explanation } : undefined,
      }
      return id ? api.patch(`/charts/${id}`, payload) : api.post('/charts', { ...config, annotations: explanation ? { explanation } : undefined })
    },
    onSuccess: (res) => {
      toast.success('Chart saved with explanation!')
      if (!id) navigate(`/t/charts/builder/${res.data.id}`)
    },
    onError: () => toast.error('Failed to save chart'),
  })

  const allCols = schema
  const set = (key) => (e) => setConfig(c => ({ ...c, [key]: e.target ? e.target.value : e }))
  const hasChart = !!(config.datasetId && config.xField && config.yField && chartData?.length)
  const topicColorClass = explanation ? (TOPIC_COLORS[explanation.mathsTopic] ?? 'text-gray-400 bg-gray-700 border-gray-600') : ''

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -m-6">

      {/* ─── LEFT CONFIG PANEL ─── */}
      <div className="w-72 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="flex border-b border-gray-800">
          {[['data', 'Data & Fields'], ['style', 'Style']].map(([t, label]) => (
            <button key={t} onClick={() => setLeftTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors
                ${leftTab === t ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/40' : 'text-gray-500 hover:text-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {leftTab === 'data' ? (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Chart Title</label>
                <input value={config.title} onChange={set('title')} className="input text-sm" />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Description (shown to students)</label>
                <textarea value={config.description} onChange={set('description')} rows={2}
                  className="input text-sm resize-none" placeholder="What should students notice in this chart?" />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Chart Type</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CHART_TYPES.map(t => (
                    <button key={t} onClick={() => setConfig(c => ({ ...c, chartType: t }))}
                      className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                        ${config.chartType === t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Dataset</label>
                <select value={config.datasetId} onChange={set('datasetId')} className="input text-sm">
                  <option value="">Select dataset...</option>
                  {datasets.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>

              {selectedDataset && (
                <>
                  {/* ── Smart suggestions ── */}
                  {(!config.xField || !config.yField) && (suggestedX || suggestedY) && (
                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Wand2 size={12} className="text-purple-400" />
                        <span className="text-xs font-semibold text-purple-300">Suggested Axes</span>
                      </div>
                      <div className="space-y-1.5">
                        {suggestedX && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              X (category): <span className="text-white font-mono">{suggestedX.name}</span>
                              <span className="text-gray-600 ml-1">({suggestedX.type})</span>
                            </span>
                            <button onClick={() => setConfig(c => ({ ...c, xField: suggestedX.name }))}
                              className="text-xs text-purple-400 hover:text-purple-300 font-medium">Use</button>
                          </div>
                        )}
                        {suggestedY && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              Y (value): <span className="text-white font-mono">{suggestedY.name}</span>
                              <span className="text-gray-600 ml-1">(number)</span>
                            </span>
                            <button onClick={() => setConfig(c => ({ ...c, yField: suggestedY.name }))}
                              className="text-xs text-purple-400 hover:text-purple-300 font-medium">Use</button>
                          </div>
                        )}
                        {suggestedX && suggestedY && (
                          <button
                            onClick={() => setConfig(c => ({ ...c, xField: suggestedX.name, yField: suggestedY.name }))}
                            className="w-full text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg py-1.5 mt-1 transition-colors">
                            Apply Both
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Column list with type icons ── */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-gray-400">Available Columns</label>
                      <button onClick={() => setShowPreviewTable(s => !s)}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                        <Table size={11} />
                        {showPreviewTable ? 'Hide' : 'Preview data'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {allCols.map(col => {
                        const Icon = col.type === 'number' ? Hash : col.type === 'date' ? Calendar : Type
                        const isX = config.xField === col.name
                        const isY = config.yField === col.name
                        return (
                          <button key={col.name}
                            onClick={() => {
                              if (col.type === 'number' && !isY) setConfig(c => ({ ...c, yField: col.name }))
                              else if (!isX) setConfig(c => ({ ...c, xField: col.name }))
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition-all ${
                              isX ? 'border-blue-500 bg-blue-500/20 text-blue-300' :
                              isY ? 'border-green-500 bg-green-500/20 text-green-300' :
                              'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                            }`}>
                            <Icon size={10} />
                            <span className="font-mono">{col.name}</span>
                            {isX && <span className="text-blue-400 font-bold ml-0.5">X</span>}
                            {isY && <span className="text-green-400 font-bold ml-0.5">Y</span>}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5">
                      Click a column to set it as X or Y axis. <span className="text-blue-400">Blue = X</span>, <span className="text-green-400">Green = Y</span>
                    </p>
                  </div>

                  {/* ── Inline data preview table ── */}
                  {showPreviewTable && previewData?.rows?.length > 0 && (
                    <div className="rounded-xl border border-gray-700 overflow-hidden">
                      <div className="px-3 py-2 bg-gray-800 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-300">
                          Data Preview <span className="text-gray-500">(first {previewData.rows.length} of {previewData.total} rows)</span>
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-800/70">
                            <tr>
                              {(previewData.schema ?? allCols).map(col => (
                                <th key={col.name}
                                  onClick={() => {
                                    if (col.type === 'number') setConfig(c => ({ ...c, yField: col.name }))
                                    else setConfig(c => ({ ...c, xField: col.name }))
                                  }}
                                  className={`px-2 py-1.5 text-left font-medium cursor-pointer whitespace-nowrap transition-colors ${
                                    config.xField === col.name ? 'text-blue-400 bg-blue-500/10' :
                                    config.yField === col.name ? 'text-green-400 bg-green-500/10' :
                                    'text-gray-500 hover:text-gray-300'
                                  }`}>
                                  {col.name}
                                  {config.xField === col.name && ' ← X'}
                                  {config.yField === col.name && ' ← Y'}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.rows.map((row, i) => (
                              <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/30">
                                {(previewData.schema ?? allCols).map(col => (
                                  <td key={col.name} className="px-2 py-1.5 text-gray-400 max-w-24 truncate">
                                    {String(row[col.name] ?? '—').slice(0, 20)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-gray-600 px-3 py-1.5 bg-gray-900">
                        Click any column header to set it as X or Y axis
                      </p>
                    </div>
                  )}

                  {/* ── Dropdowns (still needed for fine control) ── */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-blue-400 mb-1 font-medium">X Axis (Category)</label>
                      <select value={config.xField} onChange={set('xField')} className="input text-xs py-1.5">
                        <option value="">-- Select --</option>
                        {allCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-green-400 mb-1 font-medium">Y Axis (Value)</label>
                      <select value={config.yField} onChange={set('yField')} className="input text-xs py-1.5">
                        <option value="">-- Select --</option>
                        {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Aggregation</label>
                    <select value={config.aggregation} onChange={set('aggregation')} className="input text-sm">
                      {AGGREGATIONS.map(a => <option key={a} value={a}>{a === 'none' ? 'None (raw values)' : a.toUpperCase()}</option>)}
                    </select>
                  </div>

                  {config.chartType !== 'pie' && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Group By / Series</label>
                      <select value={config.seriesField} onChange={set('seriesField')} className="input text-sm">
                        <option value="">None</option>
                        {allCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Colour Palette</label>
                <div className="space-y-2">
                  {Object.entries(COLOR_PALETTES).map(([name, colors]) => (
                    <button key={name} onClick={() => setConfig(c => ({ ...c, colorPalette: name }))}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg border transition-all
                        ${config.colorPalette === name ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
                      <div className="flex gap-1">{colors.slice(0, 5).map(col => <div key={col} className="w-4 h-4 rounded-full" style={{ backgroundColor: col }} />)}</div>
                      <span className="text-xs text-gray-300 capitalize">{name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">X Axis Label</label>
                <input value={config.xLabel} onChange={set('xLabel')} className="input text-sm" placeholder="auto" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Y Axis Label</label>
                <input value={config.yLabel} onChange={set('yLabel')} className="input text-sm" placeholder="auto" />
              </div>
              <div className="flex items-center justify-between py-2">
                <label className="text-xs text-gray-400">Show Legend</label>
                <button onClick={() => setConfig(c => ({ ...c, showLegend: !c.showLegend }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${config.showLegend ? 'bg-blue-500' : 'bg-gray-700'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.showLegend ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-2">
                <label className="text-xs text-gray-400">Show Grid</label>
                <button onClick={() => setConfig(c => ({ ...c, showGrid: !c.showGrid }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${config.showGrid ? 'bg-blue-500' : 'bg-gray-700'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.showGrid ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-800 space-y-2">
          {hasChart && (
            <button onClick={generateExplanation} disabled={loadingExplanation}
              className="btn-secondary w-full text-xs flex items-center gap-2 justify-center">
              {loadingExplanation ? <Spinner size="sm" /> : <Sparkles size={13} className="text-purple-400" />}
              {loadingExplanation ? 'Generating...' : 'Regenerate Explanation'}
            </button>
          )}
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !config.datasetId}
            className="btn-primary w-full">
            {saveMutation.isPending ? <Spinner size="sm" /> : <><Save size={14} /> Save Chart</>}
          </button>
        </div>
      </div>

      {/* ─── RIGHT: PREVIEW + EXPLANATION ─── */}
      <div className="flex-1 bg-gray-950 flex flex-col overflow-hidden">

        {/* Chart preview area */}
        <div className="flex-shrink-0 bg-gray-950 border-b border-gray-800 p-6">
          {hasChart ? (
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              {/* Chart header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">{config.title}</h3>
                  {config.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{config.description}</p>
                  )}
                  {explanation?.mathsTopic && (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border mt-1.5 ${topicColorClass}`}>
                      <GraduationCap size={10} />
                      {explanation.mathsTopic}
                    </span>
                  )}
                </div>
                {loadingExplanation && (
                  <div className="flex items-center gap-1.5 text-xs text-purple-400 animate-pulse">
                    <Sparkles size={12} /> Analysing...
                  </div>
                )}
              </div>
              <ChartRenderer config={config} data={chartData} palette={COLOR_PALETTES[config.colorPalette]} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-900 rounded-xl border border-gray-800 border-dashed">
              <BarChart3 size={40} className="text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">Select a dataset, X axis and Y axis to see your chart</p>
              <p className="text-xs text-gray-600 mt-1">AI explanation will generate automatically</p>
            </div>
          )}
        </div>

        {/* Explanation panel */}
        <div className="flex-1 overflow-y-auto">
          {/* Tab bar */}
          <div className="flex border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
            {[
              { id: 'insights', label: 'Insights', icon: TrendingUp },
              { id: 'students', label: 'For Students', icon: BookOpen },
              { id: 'discuss', label: 'Discussion', icon: MessageSquare },
              { id: 'teaching', label: 'Teaching Note', icon: GraduationCap },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setRightTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap
                  ${rightTab === id ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/40' : 'text-gray-500 hover:text-gray-300'}`}>
                <Icon size={12} />{label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* No explanation yet */}
            {!explanation && !loadingExplanation && (
              <div className="text-center py-10">
                <Sparkles size={28} className="text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Configure your chart to generate an AI explanation</p>
              </div>
            )}

            {loadingExplanation && (
              <div className="text-center py-10 space-y-3">
                <Spinner size="md" className="mx-auto" />
                <p className="text-sm text-gray-400">Gemini is analysing your chart...</p>
                <p className="text-xs text-gray-600">Identifying patterns, maths topics, and teaching opportunities</p>
              </div>
            )}

            {explanation && !loadingExplanation && (
              <>
                {/* INSIGHTS TAB */}
                {rightTab === 'insights' && (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={15} className="text-blue-400" />
                        <span className="text-xs font-semibold text-blue-300">Chart Summary</span>
                      </div>
                      <p className="text-sm text-gray-200 leading-relaxed">{explanation.summary}</p>
                    </div>

                    {/* Maths topic */}
                    <div className={`p-3 rounded-xl border ${topicColorClass}`}>
                      <div className="flex items-center gap-2">
                        <GraduationCap size={14} />
                        <span className="text-xs font-semibold">Maths Topic: {explanation.mathsTopic}</span>
                      </div>
                    </div>

                    {/* Key insights */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Key Insights from the Data</p>
                      <div className="space-y-2">
                        {(explanation.keyInsights ?? []).map((insight, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-gray-800/60 rounded-lg">
                            <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <p className="text-sm text-gray-300">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* FOR STUDENTS TAB */}
                {rightTab === 'students' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <BookOpen size={15} className="text-green-400" />
                        <span className="text-xs font-semibold text-green-300">Student-Friendly Description</span>
                        <span className="badge-gray text-xs ml-auto">Age 13-16</span>
                      </div>
                      <p className="text-base text-gray-100 leading-relaxed">{explanation.forStudents}</p>
                    </div>

                    <div className="p-4 bg-gray-800/60 rounded-xl">
                      <p className="text-xs font-semibold text-gray-400 mb-2">What this chart shows:</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{explanation.summary}</p>
                    </div>

                    <div className={`p-3 rounded-xl border ${topicColorClass}`}>
                      <p className="text-xs">
                        <strong>Maths connection:</strong> This chart is a great example of <strong>{explanation.mathsTopic}</strong> in action using real esports data.
                      </p>
                    </div>

                    <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                      <p className="text-xs text-yellow-400 font-semibold mb-1">💡 Remember</p>
                      <p className="text-xs text-gray-400">Always look at the axis labels first — they tell you exactly what is being measured and compared.</p>
                    </div>
                  </div>
                )}

                {/* DISCUSSION TAB */}
                {rightTab === 'discuss' && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 mb-4">Use these questions to drive classroom discussion about the chart:</p>
                    {(explanation.discussionQuestions ?? []).map((q, i) => (
                      <div key={i} className="border border-gray-800 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                          className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-800/50 transition-colors">
                          <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0 mt-0.5">
                            Q{i + 1}
                          </span>
                          <span className="text-sm text-gray-200 flex-1">{q}</span>
                          {expandedQ === i
                            ? <ChevronUp size={14} className="text-gray-500 flex-shrink-0 mt-0.5" />
                            : <ChevronDown size={14} className="text-gray-500 flex-shrink-0 mt-0.5" />}
                        </button>
                        {expandedQ === i && (
                          <div className="px-4 pb-4 pt-1 border-t border-gray-800 bg-gray-800/30">
                            <p className="text-xs text-gray-500">
                              💡 This question prompts students to look at {i === 0 ? 'the highest value and consider why it might be highest' : i === 1 ? 'calculating the mean across all values' : 'the spread/range of the data'}.
                              Use mini-whiteboards or a quick vote to get responses.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* TEACHING NOTE TAB */}
                {rightTab === 'teaching' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb size={15} className="text-yellow-400" />
                        <span className="text-xs font-semibold text-yellow-300">Teacher Note</span>
                        <span className="text-xs text-gray-500 ml-auto">From Gemini</span>
                      </div>
                      <p className="text-sm text-gray-200 leading-relaxed">{explanation.teachingNote}</p>
                    </div>

                    <div className="p-4 bg-gray-800/50 rounded-xl space-y-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Suggested Use in Lesson</p>
                      {[
                        { step: 'Display', desc: 'Show this chart to students at the start — ask "What do you notice?"' },
                        { step: 'Discuss', desc: 'Use the Discussion Questions tab to prompt mathematical thinking.' },
                        { step: 'Calculate', desc: 'Have students compute values (mean, range, %) from the data table.' },
                        { step: 'Quiz', desc: 'Run a live MetaMaths session using questions based on this chart.' },
                      ].map(({ step, desc }) => (
                        <div key={step} className="flex items-start gap-3">
                          <span className="text-xs font-bold text-blue-400 w-16 flex-shrink-0 pt-0.5">{step}</span>
                          <p className="text-xs text-gray-400">{desc}</p>
                        </div>
                      ))}
                    </div>

                    <div className={`p-3 rounded-xl border ${topicColorClass}`}>
                      <p className="text-xs font-semibold mb-1">Curriculum Link</p>
                      <p className="text-xs">This chart primarily covers <strong>{explanation.mathsTopic}</strong>. It works for KS3 and KS4 students.</p>
                    </div>

                    {/* Editable teacher notes */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Your Notes (saved with chart)</label>
                      <textarea
                        value={config.description}
                        onChange={set('description')}
                        rows={3}
                        className="input text-sm resize-none"
                        placeholder="Add your own teaching notes here — shown to students when you share this chart..."
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
