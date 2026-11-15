import React, { useState } from 'react';
import { TelemetryPoint } from '../data/storyboard';

interface TelemetryTraceChartProps {
  points: TelemetryPoint[];
  compact?: boolean;
  label?: string;
}

export const TelemetryTraceChart: React.FC<TelemetryTraceChartProps> = ({
  points,
  compact = false,
  label = 'Wheel Angular Velocity vs. Forward Progress',
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 420;
  const height = compact ? 116 : 168;
  const padLeft = 36;
  const padRight = 14;
  const padTop = 14;
  const padBottom = 24;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const maxTime = Math.max(8, ...points.map((p) => p.t));
  const maxVel = 4.0;
  const maxProg = 0.6;

  const xFor = (t: number) => padLeft + (t / maxTime) * innerW;
  const yVel = (v: number) => padTop + innerH - Math.min(1, v / maxVel) * innerH;
  const yProg = (p: number) => padTop + innerH - Math.min(1, p / maxProg) * innerH;

  const velPath = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xFor(pt.t).toFixed(1)} ${yVel(pt.wheelAngularVelocity).toFixed(1)}`)
    .join(' ');

  const progPath = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xFor(pt.t).toFixed(1)} ${yProg(pt.forwardProgress).toFixed(1)}`)
    .join(' ');

  const activePoint = hoverIdx !== null ? points[hoverIdx] : points[points.length - 1];

  return (
    <div className="w-full">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-300">{label}</span>
        <div className="flex items-center gap-4 font-mono tabular-nums text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-amber-400" aria-hidden="true" />
            Wheel {activePoint ? `${activePoint.wheelAngularVelocity.toFixed(2)} rad/s` : '—'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-cyan-400" aria-hidden="true" />
            Progress {activePoint ? `${activePoint.forwardProgress.toFixed(2)} m/s` : '—'}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`${compact ? 'max-h-32' : 'max-h-52'} w-full overflow-visible rounded border border-slate-800 bg-[#070A10]`}
        role="img"
        aria-label={label}
      >
        {[0.25, 0.5, 0.75].map((ratio) => {
          const y = padTop + innerH * ratio;
          return (
            <line
              key={ratio}
              x1={padLeft}
              y1={y}
              x2={width - padRight}
              y2={y}
              stroke="#1E293B"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          );
        })}

        <line
          x1={padLeft}
          y1={padTop + innerH}
          x2={width - padRight}
          y2={padTop + innerH}
          stroke="#334155"
          strokeWidth="1"
        />

        <path d={velPath} fill="none" stroke="#F59E0B" strokeWidth="2" />
        <path d={progPath} fill="none" stroke="#06B6D4" strokeWidth="2" />

        {points.map((pt, idx) => {
          const cx = xFor(pt.t);
          return (
            <g key={pt.t}>
              <circle cx={cx} cy={yVel(pt.wheelAngularVelocity)} r={hoverIdx === idx ? 4 : 2.5} fill="#F59E0B" />
              <circle cx={cx} cy={yProg(pt.forwardProgress)} r={hoverIdx === idx ? 4 : 2.5} fill="#06B6D4" />
              <rect
                x={cx - 18}
                y={padTop}
                width={36}
                height={innerH}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
              />
              <text
                x={cx}
                y={height - 6}
                textAnchor="middle"
                fill="#64748B"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                {pt.t.toFixed(1)}s
              </text>
            </g>
          );
        })}

        {hoverIdx !== null && activePoint && (
          <line
            x1={xFor(activePoint.t)}
            y1={padTop}
            x2={xFor(activePoint.t)}
            y2={padTop + innerH}
            stroke="#94A3B8"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        )}
      </svg>
    </div>
  );
};
