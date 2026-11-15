import React, { useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getMissionSeriesByWorld,
  MissionCyclePoint,
  summarizeLearningProgress,
  WorldFilter,
} from '../utils/learningMetrics';

const WORLD_FILTERS: WorldFilter[] = ['All', 'Earth', 'Moon', 'Mars'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MissionCyclePoint }>;
}

const MissionTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;
  return (
    <div className="max-w-xs rounded-md border border-slate-700 bg-[#07090E]/95 p-3 text-xs shadow-lg">
      <p className="font-mono font-semibold text-cyan-300">
        {pt.cycleLabel} · {pt.policyVersion}
      </p>
      <p className="mt-1 text-[11px] text-slate-400">
        {pt.world} · {pt.datasetVersion} · {pt.reviewedEpisodes} reviewed episodes
      </p>
      <div className="mt-2 space-y-1 font-mono tabular-nums">
        <p className="text-cyan-400">Mission Success: {pt.successRatePct}%</p>
        <p className="text-amber-400">Slip Recovery: {pt.recoveryRatePct}%</p>
      </div>
      <p className="mt-2 border-t border-slate-800 pt-2 text-[11px] leading-snug text-slate-300">
        {pt.lessonTitle}
      </p>
    </div>
  );
};

export const MissionLearningDashboard: React.FC = () => {
  const [worldFilter, setWorldFilter] = useState<WorldFilter>('All');
  const [selectedCycleId, setSelectedCycleId] = useState<string>('c5');

  const series = getMissionSeriesByWorld(worldFilter);
  const summary = summarizeLearningProgress(series);
  const activePoint =
    series.find((pt) => pt.cycleId === selectedCycleId) ||
    series[series.length - 1];

  return (
    <section
      aria-labelledby="learning-dashboard-heading"
      data-testid="mission-learning-dashboard"
      className="space-y-5 rounded-lg border border-slate-800 bg-[#0B0F17] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2
            id="learning-dashboard-heading"
            className="font-display text-base font-semibold text-slate-100"
          >
            Every Mission Teaches the Next · Policy Progression
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Illustrative concept progression linking reviewed Atlas failure intervals and generated variants to subsequent rollout completion
          </p>
        </div>

        <div
          className="flex items-center gap-1 rounded-md border border-slate-800 bg-[#07090E] p-1"
          role="group"
          aria-label="Filter mission progression by planetary environment"
        >
          {WORLD_FILTERS.map((world) => {
            const active = worldFilter === world;
            return (
              <button
                key={world}
                type="button"
                onClick={() => {
                  setWorldFilter(world);
                  const nextSeries = getMissionSeriesByWorld(world);
                  if (nextSeries.length > 0 && !nextSeries.some((p) => p.cycleId === selectedCycleId)) {
                    setSelectedCycleId(nextSeries[nextSeries.length - 1].cycleId);
                  }
                }}
                className={`rounded px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {world === 'All' ? 'All Worlds' : world}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded border border-slate-800 bg-[#07090E] px-4 py-3">
          <p className="text-[11px] font-medium text-slate-400">
            Latest Policy Success Rate ({summary.latestPolicy})
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-cyan-400 tabular-nums">
            {summary.latestSuccessPct}%
          </p>
        </div>
        <div className="rounded border border-slate-800 bg-[#07090E] px-4 py-3">
          <p className="text-[11px] font-medium text-slate-400">
            Net Learning Gain Across Window
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-emerald-400 tabular-nums">
            {summary.successDeltaPts >= 0 ? `+${summary.successDeltaPts}` : summary.successDeltaPts} pp
          </p>
        </div>
        <div className="rounded border border-slate-800 bg-[#07090E] px-4 py-3">
          <p className="text-[11px] font-medium text-slate-400">
            Reviewed Atlas Episodes in Dataset
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-amber-400 tabular-nums">
            {summary.totalReviewedEpisodes}
          </p>
        </div>
      </div>

      {/* Recharts Visualization + Lesson Inspector */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-lg border border-slate-800 bg-[#07090E] p-4 lg:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-slate-300">
              Mission Completion & Slip-Recovery Rate Over Policy Iterations
            </span>
            <div className="flex items-center gap-4 font-mono text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3 bg-cyan-400" aria-hidden="true" />
                Mission Success (%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-3 bg-amber-400" aria-hidden="true" />
                Slip Recovery (%)
              </span>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={series}
                margin={{ top: 10, right: 32, left: -8, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="missionSuccessGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="policyVersion"
                  stroke="#64748B"
                  padding={{ left: 14, right: 14 }}
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#64748B"
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip content={<MissionTooltip />} />
                {activePoint && (
                  <ReferenceLine
                    x={activePoint.policyVersion}
                    stroke="#38BDF8"
                    strokeDasharray="4 4"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="successRatePct"
                  name="Mission Success"
                  stroke="#06B6D4"
                  strokeWidth={2.5}
                  fill="url(#missionSuccessGrad)"
                  isAnimationActive={false}
                  dot={{ r: 4, fill: '#06B6D4', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#22D3EE' }}
                />
                <Line
                  type="monotone"
                  dataKey="recoveryRatePct"
                  name="Slip Recovery"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  isAnimationActive={false}
                  dot={{ r: 3.5, fill: '#F59E0B', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#FBBF24' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Selected Iteration Lesson Panel */}
        <div className="flex flex-col justify-between rounded-lg border border-slate-800 bg-[#07090E] p-4 lg:col-span-4">
          {activePoint ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <span className="font-mono text-xs font-semibold text-cyan-400">
                  {activePoint.cycleLabel}
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {activePoint.world}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="font-display text-sm font-semibold text-slate-100">
                  {activePoint.lessonTitle}
                </h3>
                <p className="text-xs leading-relaxed text-slate-300">
                  {activePoint.lessonSummary}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 font-mono text-xs tabular-nums">
                <div>
                  <span className="block text-[10px] text-slate-500">Policy / Dataset</span>
                  <span className="text-slate-200">
                    {activePoint.policyVersion} / {activePoint.datasetVersion}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">Success / Recovery</span>
                  <span className="text-cyan-400">
                    {activePoint.successRatePct}% / {activePoint.recoveryRatePct}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Select a policy cycle to inspect.</p>
          )}

          <div className="mt-4 border-t border-slate-800 pt-3">
            <p className="mb-2 text-[11px] font-medium text-slate-400">
              Inspect Mission Iteration
            </p>
            <div className="flex flex-wrap gap-1.5">
              {series.map((pt) => {
                const selected = pt.cycleId === activePoint?.cycleId;
                return (
                  <button
                    key={pt.cycleId}
                    type="button"
                    onClick={() => setSelectedCycleId(pt.cycleId)}
                    className={`rounded border px-2 py-1 font-mono text-[11px] tabular-nums transition-colors ${
                      selected
                        ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                        : 'border-slate-800 bg-[#0B0F17] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {pt.policyVersion.replace('Policy ', '')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
