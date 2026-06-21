import React from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const DEFAULT_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#eab308',
]

const tooltipStyle = {
  backgroundColor: '#1f2937', border: '1px solid #374151',
  borderRadius: '8px', color: '#e5e7eb', fontSize: '12px',
}

// Custom tooltip that formats large numbers nicely
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle} className="p-3 shadow-xl">
      <p className="font-medium text-white mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="text-xs">
          {entry.name}: <span className="font-bold">{formatValue(entry.value)}</span>
        </p>
      ))}
    </div>
  )
}

function formatValue(v) {
  if (typeof v !== 'number') return v
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  if (!Number.isInteger(v)) return v.toFixed(2)
  return v.toLocaleString()
}

export default function ChartRenderer({ config, data, palette }) {
  const colors = palette ?? DEFAULT_COLORS
  const { chartType, title, xLabel, yLabel, showLegend = true, showGrid = true } = config
  const chartData = data ?? []
  const seriesKeys = getSeriesKeys(chartData)
  // Use single series → per-bar colors; multiple series → per-series colors
  const isSingleSeries = seriesKeys.length === 1

  const margin = { top: 10, right: 16, left: 0, bottom: 40 }

  const xAxisProps = {
    dataKey: 'x',
    tick: { fontSize: 11, fill: '#9ca3af' },
    angle: chartData.length > 8 ? -35 : 0,
    textAnchor: chartData.length > 8 ? 'end' : 'middle',
    interval: 0,
    label: xLabel ? { value: xLabel, position: 'insideBottom', offset: -25, fill: '#6b7280', fontSize: 11 } : undefined,
  }

  const yAxisProps = {
    tick: { fontSize: 11, fill: '#9ca3af' },
    tickFormatter: formatValue,
    width: 55,
    label: yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 } : undefined,
  }

  const renderChart = () => {
    switch (chartType) {

      case 'line':
        return (
          <LineChart data={chartData} margin={margin}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && seriesKeys.length > 1 && <Legend />}
            {seriesKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} name={key}
                stroke={colors[i % colors.length]} strokeWidth={2.5}
                dot={{ fill: colors[i % colors.length], r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }} />
            ))}
          </LineChart>
        )

      case 'area':
        return (
          <AreaChart data={chartData} margin={margin}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && seriesKeys.length > 1 && <Legend />}
            {seriesKeys.map((key, i) => (
              <Area key={key} type="monotone" dataKey={key} name={key}
                stroke={colors[i % colors.length]}
                fill={colors[i % colors.length] + '30'}
                strokeWidth={2} />
            ))}
          </AreaChart>
        )

      case 'pie':
        return (
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" outerRadius={130}
              dataKey="y" nameKey="x"
              label={({ name, percent }) => `${String(name).slice(0, 10)} ${(percent * 100).toFixed(1)}%`}
              labelLine={true}>
              {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
          </PieChart>
        )

      case 'scatter':
        return (
          <ScatterChart margin={margin}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
            <XAxis dataKey="x" name={xLabel || 'X'} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={formatValue} />
            <YAxis dataKey="y" name={yLabel || 'Y'} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={formatValue} width={55} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            {showLegend && <Legend />}
            <Scatter data={chartData} name={yLabel || 'Data'}>
              {chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Scatter>
          </ScatterChart>
        )

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius={130} data={chartData}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis dataKey="x" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <PolarRadiusAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={formatValue} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {seriesKeys.map((key, i) => (
              <Radar key={key} name={key} dataKey={key}
                stroke={colors[i % colors.length]}
                fill={colors[i % colors.length]} fillOpacity={0.25} />
            ))}
          </RadarChart>
        )

      default: // bar — per-bar colors when single series
        return (
          <BarChart data={chartData} margin={margin}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && !isSingleSeries && <Legend />}
            {seriesKeys.map((key, seriesIdx) => (
              <Bar key={key} dataKey={key} name={key}
                fill={isSingleSeries ? colors[0] : colors[seriesIdx % colors.length]}
                radius={[4, 4, 0, 0]}>
                {/* Per-bar coloring when single series */}
                {isSingleSeries && chartData.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Bar>
            ))}
          </BarChart>
        )
    }
  }

  return (
    <div className="w-full">
      {title && <h3 className="text-center text-sm font-medium text-gray-300 mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={340}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}

function getSeriesKeys(data) {
  if (!data?.length) return ['y']
  return Object.keys(data[0]).filter(k => k !== 'x' && k !== 'name')
}
