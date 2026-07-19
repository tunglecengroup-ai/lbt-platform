"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortVND, formatVND, formatNumber } from "@/lib/utils";
import { revenueByMonth, leadsBySource } from "@/lib/mock-data";

const axisStyle = { fontSize: 12, fill: "hsl(var(--muted-foreground))" };

function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-md border px-3 py-2 text-xs shadow-md">{children}</div>
  );
}

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={revenueByMonth} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v) => formatShortVND(v)}
        />
        <Tooltip
          cursor={{ stroke: "hsl(var(--border))" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TooltipBox>
                <p className="mb-1 font-medium">{label}</p>
                <p className="tabular text-primary">{formatVND(payload[0].value as number)}</p>
              </TooltipBox>
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="doanhThu"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#rev)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function NewStudentsChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={revenueByMonth} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={28} />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TooltipBox>
                <p className="mb-1 font-medium">{label}</p>
                <p className="tabular text-violet">
                  {formatNumber(payload[0].value as number)} học viên mới
                </p>
              </TooltipBox>
            ) : null
          }
        />
        <Bar dataKey="hocVienMoi" fill="hsl(var(--violet))" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LeadsSourceChart() {
  const total = leadsBySource.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={leadsBySource}
              dataKey="value"
              nameKey="source"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
            >
              {leadsBySource.map((d) => (
                <Cell key={d.source} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TooltipBox>
                    <p className="font-medium">{payload[0].name}</p>
                    <p className="tabular">{formatNumber(payload[0].value as number)} lead</p>
                  </TooltipBox>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-xl font-semibold">{formatNumber(total)}</span>
          <span className="text-muted-foreground text-xs">tổng lead</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2">
        {leadsBySource.map((d) => (
          <li key={d.source} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ background: d.color }} />
            <span className="flex-1">{d.source}</span>
            <span className="tabular text-muted-foreground">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
