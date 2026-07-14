"use client";

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import type { ReadinessHistoryPoint } from "@/lib/data/readiness";

export function ReadinessHistory({
  points,
}: {
  points: ReadinessHistoryPoint[];
}) {
  const data = points.map((p, i) => ({ i, score: p.score }));
  return (
    <div className="h-40 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ left: 0, right: 8, top: 8, bottom: 4 }}
        >
          <XAxis dataKey="i" hide />
          <YAxis
            domain={[0, 100]}
            width={28}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--success)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--success)" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
