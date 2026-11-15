import React, { useState } from 'react';
import { ExternalLink, Globe, MapPin, Search, Sparkles } from 'lucide-react';
import { ATLAS_EPISODES, AtlasEpisode } from '../data/storyboard';
import { filterAtlasEpisodes } from '../utils/filmTimeline';
import { SafeImage } from './SafeImage';
import { TelemetryTraceChart } from './TelemetryTraceChart';
import { MissionLearningDashboard } from './MissionLearningDashboard';

interface WebSource {
  title: string;
  uri: string;
}

interface MapPlace {
  title: string;
  uri: string;
  reviewSnippets: Array<{ text?: string } | string>;
}

export const AtlasAndGrounding: React.FC = () => {
  const [atlasQuery, setAtlasQuery] = useState('Find Mars rover recoveries after wheel slip');
  const [onlyApproved, setOnlyApproved] = useState(false);
  const [selectedEp, setSelectedEp] = useState<AtlasEpisode>(ATLAS_EPISODES[1]);

  // Deep platform reasoning (gemini-4-carbon)
  const [reasoningResult, setReasoningResult] = useState<string | null>(null);
  const [reasoningLoading, setReasoningLoading] = useState(false);
  const [reasoningError, setReasoningError] = useState<string | null>(null);

  // Google Search Grounding (gemini-4-hydrogen)
  const [searchQuery, setSearchQuery] = useState(
    'NASA MRO HiRISE Mars Jezero Crater elevation DEM and LRO LOLA lunar terrain datasets for robotics simulation'
  );
  const [searchAnswer, setSearchAnswer] = useState<string | null>(null);
  const [searchSources, setSearchSources] = useState<WebSource[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Google Maps Grounding (gemini-4-hydrogen)
  const [mapsQuery, setMapsQuery] = useState(
    'Mars analog desert rover test sites and robotics field test valleys in California Mojave Desert and Utah'
  );
  const [useBrowserLocation, setUseBrowserLocation] = useState(false);
  const [mapsAnswer, setMapsAnswer] = useState<string | null>(null);
  const [mapsPlaces, setMapsPlaces] = useState<MapPlace[]>([]);
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  const filteredEpisodes = filterAtlasEpisodes(ATLAS_EPISODES, atlasQuery, onlyApproved);

  const runDeepAudit = async () => {
    setReasoningError(null);
    setReasoningLoading(true);
    try {
      const res = await fetch('/api/gemini/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-4-carbon',
          prompt: `Review our Atlas concept episode selection for Scene 4 & 6. Pinned failure is Episode 0142 (Mars wheel slip in sandy rut next to split basalt boulder). Selected recovery is ${selectedEp.episodeCode} (${selectedEp.summary}). Explain cleanly how Atlas connects evidence provenance to Dataset v02 curation without inventing fake metrics.`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reasoning request failed.');
      setReasoningResult(data.text);
    } catch (err) {
      setReasoningError(err instanceof Error ? err.message : 'Reasoning request failed.');
    } finally {
      setReasoningLoading(false);
    }
  };

  const handleSearchGrounding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    if (!searchQuery.trim()) {
      setSearchError('Enter a terrain research query.');
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch('/api/gemini/grounding/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search grounding failed.');
      setSearchAnswer(data.text);
      setSearchSources(data.sources || []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search grounding failed.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleMapsGrounding = async (e: React.FormEvent) => {
    e.preventDefault();
    setMapsError(null);
    if (!mapsQuery.trim()) {
      setMapsError('Enter a field-test site query.');
      return;
    }
    setMapsLoading(true);
    try {
      let latLng: { latitude: number; longitude: number } | undefined;
      if (useBrowserLocation && navigator.geolocation) {
        latLng = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }),
            () => resolve(undefined),
            { timeout: 5000 }
          );
        });
      }

      const res = await fetch('/api/gemini/grounding/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: mapsQuery, latLng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Maps grounding failed.');
      setMapsAnswer(data.text);
      setMapsPlaces(data.places || []);
    } catch (err) {
      setMapsError(err instanceof Error ? err.message : 'Maps grounding failed.');
    } finally {
      setMapsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="font-display text-2xl font-semibold text-slate-100">
          Atlas Episode Review & Terrain Grounding
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Explore mission learning progression, the concept Atlas evidence query, and live Google Search and Maps terrain research.
        </p>
      </div>

      {/* 1. Recharts Mission Learning Progression Dashboard */}
      <MissionLearningDashboard />

      {/* 2. Interactive Atlas Concept Episode Explorer */}
      <section aria-labelledby="atlas-explorer-heading" className="space-y-4 rounded-lg border border-slate-800 bg-[#0B0F17] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 id="atlas-explorer-heading" className="font-display text-base font-semibold text-slate-100">
              Atlas · Concept Episode Review
            </h2>
            <p className="text-xs text-slate-400">
              Semantic experience retrieval · Not every retrieved mission interval is eligible for control training
            </p>
          </div>
          <button
            type="button"
            onClick={runDeepAudit}
            disabled={reasoningLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {reasoningLoading ? 'Auditing Architecture...' : 'Audit Provenance (Gemini 4 Carbon)'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <label htmlFor="atlas-query-input" className="sr-only">
              Semantic episode query
            </label>
            <input
              id="atlas-query-input"
              type="text"
              value={atlasQuery}
              onChange={(e) => setAtlasQuery(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-[#07090E] py-2 pr-3 pl-9 font-mono text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-md border border-slate-800 bg-[#07090E] p-1">
            <button
              type="button"
              onClick={() => setOnlyApproved(false)}
              className={`rounded px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                !onlyApproved ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Retrieved ({ATLAS_EPISODES.length})
            </button>
            <button
              type="button"
              onClick={() => setOnlyApproved(true)}
              className={`rounded px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${
                onlyApproved ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Review Approved Only
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="space-y-2.5 lg:col-span-5">
            {filteredEpisodes.length === 0 ? (
              <div className="rounded border border-slate-800 bg-[#07090E] p-6 text-center text-xs text-slate-400">
                No matching mission episodes for “{atlasQuery}”.
              </div>
            ) : (
              filteredEpisodes.map((ep) => {
                const isSelected = ep.id === selectedEp.id;
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => setSelectedEp(ep)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-cyan-400 bg-[#0F172A]'
                        : 'border-slate-800 bg-[#07090E] hover:border-slate-700'
                    }`}
                  >
                    <div className="h-14 w-24 shrink-0 overflow-hidden rounded border border-slate-800">
                      <SafeImage src={ep.thumbnailPath} alt={`${ep.episodeCode} thumbnail`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-100">
                          {ep.episodeCode} · {ep.world}
                        </span>
                        <span
                          className={`text-[11px] font-medium ${
                            ep.reviewApproved ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {ep.reviewApproved ? 'Approved' : 'Needs Review'}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                        {ep.summary}
                      </p>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        {ep.sourceRecorded} · {ep.purpose}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="space-y-4 rounded-lg border border-slate-800 bg-[#07090E] p-4 lg:col-span-7">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-800 pb-3 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <p className="font-mono text-xs text-cyan-400">
                  {selectedEp.episodeCode} · {selectedEp.site}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {selectedEp.summary}
                </p>
              </div>
              <div className="shrink-0 font-mono text-[11px] text-slate-400 sm:text-right">
                <p>{selectedEp.sourceRecorded}</p>
                <p className={selectedEp.reviewApproved ? 'text-emerald-400' : 'text-amber-400'}>
                  {selectedEp.statusLabel} · {selectedEp.purpose}
                </p>
              </div>
            </div>

            <TelemetryTraceChart
              points={selectedEp.telemetry}
              label={`${selectedEp.episodeCode} · Synchronized Wheel Speed vs. Forward Progress`}
            />

            {reasoningError && (
              <p role="alert" className="rounded border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-200">
                {reasoningError}
              </p>
            )}
            {reasoningResult && (
              <div className="rounded border border-cyan-500/30 bg-[#0B121F] p-3 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
                {reasoningResult}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. Google Search Grounding + Google Maps Grounding */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Search Grounding */}
        <section aria-labelledby="search-grounding-heading" className="space-y-4 rounded-lg border border-slate-800 bg-[#0B0F17] p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <h2 id="search-grounding-heading" className="font-display text-sm font-semibold text-slate-100">
                NASA Planetary Terrain Research (Search Grounding)
              </h2>
            </div>
            <span className="font-mono text-[11px] text-slate-400">gemini-4-hydrogen</span>
          </div>

          <form onSubmit={handleSearchGrounding} className="space-y-3">
            <label htmlFor="search-grounding-input" className="sr-only">
              Search planetary terrain datasets
            </label>
            <input
              id="search-grounding-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-[#07090E] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={searchLoading}
              className="rounded-md bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-50"
            >
              {searchLoading ? 'Searching NASA & Planetary Sources...' : 'Search Terrain Datasets'}
            </button>
          </form>

          {searchError && (
            <p role="alert" className="rounded border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-200">
              {searchError}
            </p>
          )}

          {searchAnswer && (
            <div className="space-y-3 rounded border border-slate-800 bg-[#07090E] p-4">
              <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                {searchAnswer}
              </div>
              {searchSources.length > 0 && (
                <div className="border-t border-slate-800 pt-3">
                  <p className="mb-2 text-[11px] font-semibold text-slate-400">
                    Grounded Web Sources
                  </p>
                  <ul className="space-y-1.5">
                    {searchSources.map((src, idx) => (
                      <li key={idx}>
                        <a
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="truncate max-w-[440px]">{src.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Maps Grounding */}
        <section aria-labelledby="maps-grounding-heading" className="space-y-4 rounded-lg border border-slate-800 bg-[#0B0F17] p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <h2 id="maps-grounding-heading" className="font-display text-sm font-semibold text-slate-100">
                Earth Analog Rover Test Valleys (Maps Grounding)
              </h2>
            </div>
            <span className="font-mono text-[11px] text-slate-400">gemini-4-hydrogen</span>
          </div>

          <form onSubmit={handleMapsGrounding} className="space-y-3">
            <label htmlFor="maps-grounding-input" className="sr-only">
              Search Earth analog rover test locations
            </label>
            <input
              id="maps-grounding-input"
              type="text"
              value={mapsQuery}
              onChange={(e) => setMapsQuery(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-[#07090E] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={useBrowserLocation}
                  onChange={(e) => setUseBrowserLocation(e.target.checked)}
                  className="h-3.5 w-3.5 accent-amber-400"
                />
                <span>Include current geolocation bias</span>
              </label>
              <button
                type="submit"
                disabled={mapsLoading}
                className="rounded-md bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
              >
                {mapsLoading ? 'Locating Test Valleys...' : 'Find Field Sites'}
              </button>
            </div>
          </form>

          {mapsError && (
            <p role="alert" className="rounded border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-200">
              {mapsError}
            </p>
          )}

          {mapsAnswer && (
            <div className="space-y-3 rounded border border-slate-800 bg-[#07090E] p-4">
              <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                {mapsAnswer}
              </div>
              {mapsPlaces.length > 0 && (
                <div className="border-t border-slate-800 pt-3">
                  <p className="mb-2 text-[11px] font-semibold text-slate-400">
                    Google Maps Locations
                  </p>
                  <ul className="space-y-2">
                    {mapsPlaces.map((place, idx) => (
                      <li key={idx} className="space-y-1">
                        <a
                          href={place.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:underline"
                        >
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span>{place.title}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        </a>
                        {place.reviewSnippets?.length > 0 && (
                          <p className="pl-4 text-[11px] text-slate-400">
                            {typeof place.reviewSnippets[0] === 'string'
                              ? place.reviewSnippets[0]
                              : place.reviewSnippets[0]?.text}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
