"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";

interface DataPoint {
  date: string;
  weight: number;
}

interface LiftChartProps {
  data: Record<string, DataPoint[]>;
}

const CHART_W = 300;
const CHART_H = 120;
const PAD = { top: 10, right: 10, bottom: 20, left: 40 };

function MiniChart({ points }: { points: DataPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-[140px] items-center justify-center text-[10px] font-bold uppercase tracking-widest text-outline">
        NEED 2+ LOGS TO CHART
      </div>
    );
  }

  const weights = points.map((p) => p.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;

  const xScale = (i: number) => PAD.left + (i / (points.length - 1)) * innerW;
  const yScale = (w: number) =>
    PAD.top + innerH - ((w - minW) / range) * innerH;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(p.weight)}`)
    .join(" ");

  const areaD =
    pathD +
    ` L ${xScale(points.length - 1)} ${PAD.top + innerH} L ${PAD.left} ${PAD.top + innerH} Z`;

  const latest = points[points.length - 1];
  const first = points[0];
  const totalDelta = latest.weight - first.weight;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-headline text-lg font-bold text-on-surface">
          {latest.weight}kg
        </span>
        <span
          className={`text-[10px] font-bold ${
            totalDelta > 0
              ? "text-primary"
              : totalDelta < 0
                ? "text-red-400"
                : "text-on-surface-variant"
          }`}
        >
          {totalDelta > 0 ? "+" : ""}
          {totalDelta.toFixed(1)}kg ALL TIME
        </span>
      </div>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="h-[140px] w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cafd00" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#cafd00" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((frac) => {
          const y = PAD.top + innerH * (1 - frac);
          const val = minW + range * frac;
          return (
            <g key={frac}>
              <line
                x1={PAD.left}
                x2={CHART_W - PAD.right}
                y1={y}
                y2={y}
                stroke="#494847"
                strokeWidth="0.5"
                strokeDasharray="3,3"
              />
              <text
                x={PAD.left - 4}
                y={y + 3}
                textAnchor="end"
                fontSize="8"
                fill="#777575"
              >
                {Math.round(val)}
              </text>
            </g>
          );
        })}

        <path d={areaD} fill="url(#areaFill)" />
        <path
          d={pathD}
          fill="none"
          stroke="#cafd00"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(p.weight)}
            r="3"
            fill="#0e0e0e"
            stroke="#cafd00"
            strokeWidth="1.5"
          />
        ))}

        {points.length <= 10 &&
          points
            .filter((_, i) => i === 0 || i === points.length - 1)
            .map((p, idx) => {
              const i = idx === 0 ? 0 : points.length - 1;
              return (
                <text
                  key={i}
                  x={xScale(i)}
                  y={CHART_H - 2}
                  textAnchor={i === 0 ? "start" : "end"}
                  fontSize="7"
                  fill="#777575"
                >
                  {format(parseISO(p.date), "d MMM")}
                </text>
              );
            })}
      </svg>
    </div>
  );
}

export function LiftCharts({ data }: LiftChartProps) {
  const liftNames = Object.keys(data).filter((k) => data[k].length >= 1);
  const [selected, setSelected] = useState(liftNames[0] ?? "");

  if (liftNames.length === 0) return null;

  return (
    <section>
      <h3 className="mb-4 font-headline text-xl font-black uppercase tracking-tighter">
        PROGRESS CHARTS
      </h3>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {liftNames.map((name) => (
          <button
            key={name}
            onClick={() => setSelected(name)}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              selected === name
                ? "bg-primary-container text-on-primary-fixed"
                : "bg-surface-variant text-on-surface-variant hover:bg-surface-bright"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-high p-5">
        {selected && data[selected] && (
          <MiniChart points={data[selected]} />
        )}
      </div>
    </section>
  );
}
