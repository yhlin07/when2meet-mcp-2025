'use client'
import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Sankey,
} from 'recharts'
import type {
  Visualization,
  SeriesDatum,
  SankeyData,
  TimelineItem,
} from '@/app/hooks/use-report-generation'

const COLORS = ['#ffbd59', '#8cd3ff', '#a7f3d0', '#e9d5ff', '#fecaca', '#fde68a']

function isSeries(data: unknown): data is SeriesDatum[] {
  return Array.isArray(data) && data.every((d) => 'label' in d && 'value' in d)
}

function isSankey(data: unknown): data is SankeyData {
  if (!data || typeof data !== 'object') return false
  const obj = data as { nodes?: unknown; links?: unknown }
  return Array.isArray(obj.nodes) && Array.isArray(obj.links)
}

function isTimeline(data: unknown): data is TimelineItem[] {
  return Array.isArray(data) && data.every((d) => 'title' in d && 'period' in d)
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-8">
      <h3 className="text-xl font-heading mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-700 mb-2">{description}</p>}
      <div className="sketch-card bg-white">
        <div style={{ width: '100%', height: 280 }}>{children}</div>
      </div>
    </div>
  )
}

export default function Visualizations({ items }: { items: Visualization[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-heading mb-4 transform -rotate-1">
        📊 AI-picked visualizations
      </h2>
      {items.map((viz, idx) => {
        if (viz.type === 'bar' && isSeries(viz.data)) {
          return (
            <ChartCard key={idx} title={viz.title} description={viz.description}>
              <ResponsiveContainer>
                <BarChart data={viz.data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="value" fill="#82ca9d" stroke="#000" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )
        }

        if (viz.type === 'pie' && isSeries(viz.data)) {
          const series = viz.data
          return (
            <ChartCard key={idx} title={viz.title} description={viz.description}>
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip />
                  <Pie
                    dataKey="value"
                    data={series}
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                  >
                    {series.map((entry, i) => (
                      <Cell key={`slice-${i}`} fill={COLORS[i % COLORS.length]} stroke="#000" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )
        }

        if (viz.type === 'line' && isSeries(viz.data)) {
          return (
            <ChartCard key={idx} title={viz.title} description={viz.description}>
              <ResponsiveContainer>
                <LineChart data={viz.data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ stroke: '#000', strokeWidth: 1 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )
        }

        if (viz.type === 'sankey' && isSankey(viz.data)) {
          const data = viz.data
          // Recharts Sankey expects { nodes, links }
          return (
            <ChartCard key={idx} title={viz.title} description={viz.description}>
              <ResponsiveContainer>
                <Sankey
                  data={data}
                  nodePadding={24}
                  margin={{ left: 24, right: 24, top: 12, bottom: 12 }}
                  linkCurvature={0.5}
                />
              </ResponsiveContainer>
            </ChartCard>
          )
        }

        if (viz.type === 'timeline' && isTimeline(viz.data)) {
          const items = viz.data
          return (
            <ChartCard key={idx} title={viz.title} description={viz.description}>
              <div className="p-2 overflow-y-auto" style={{ height: 280 }}>
                <div className="relative pl-6">
                  {items.map((item, i) => (
                    <div key={`${item.title}-${item.period}-${i}`} className="relative pl-4 pb-4">
                      <div className="absolute left-0 top-2 w-3 h-3 bg-butter border-2 border-black rounded-full" />
                      {i !== 0 && (
                        <div className="absolute left-1.5 -top-4 w-0.5 h-4 bg-black" aria-hidden />
                      )}
                      <div className="border-2 border-black rounded-[10px] p-2 bg-butter/40">
                        <div className="flex items-center gap-2">
                          <strong className="font-heading text-sm">{item.title}</strong>
                          {item.company && (
                            <span className="text-xs text-gray-700">@ {item.company}</span>
                          )}
                          <span className="ml-auto text-xs text-gray-600">{item.period}</span>
                        </div>
                        {item.notes && <p className="mt-1 text-xs text-gray-700">{item.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          )
        }

        // Fallback: if shape doesn't match, skip rendering this viz
        return null
      })}
    </section>
  )
}
