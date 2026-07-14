"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import {
  READINESS_COMPONENT_LABELS,
  type ReadinessComponent,
} from "@/lib/readiness/calculator";

/**
 * Component breakdown: earned points out of each category's weight. Decorative
 * (aria-hidden) — the readiness page renders the same data as an accessible
 * list with explanations, which is the text alternative.
 */
export function ReadinessChart({
  components,
}: {
  components: ReadinessComponent[];
}) {
  const data = components.map((c) => ({
    name: READINESS_COMPONENT_LABELS[c.component],
    pct100: Math.round(c.raw * 100),
    pct: c.raw,
  }));

  return (
    <div className="h-72 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
          barCategoryGap={6}
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 12, fill: "#667085" }}
            axisLine={false}
            tickLine={false}
          />
          <Bar
            dataKey="pct100"
            radius={4}
            isAnimationActive={false}
            background={{ fill: "#f0e7cf", radius: 4 }}
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={
                  d.pct >= 0.75
                    ? "#4d7b55"
                    : d.pct >= 0.4
                      ? "#ffd21f"
                      : "#7b4b20"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
