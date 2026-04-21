'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ChartPoint {
  sprint: string
  initialCommit: number | null
  committed: number | null
  delivered: number | null
  capacity: number
}

export default function VelocityChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="sprint" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="capacity"
          name="Capacity SP"
          stroke="#e5e7eb"
          strokeWidth={2}
          dot={false}
          strokeDasharray="4 4"
        />
        <Line
          type="monotone"
          dataKey="initialCommit"
          name="Initial Commit"
          stroke="#a5b4fc"
          strokeWidth={2}
          dot={{ r: 4 }}
          strokeDasharray="5 3"
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="committed"
          name="Final Commit"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="delivered"
          name="Delivered SP"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
