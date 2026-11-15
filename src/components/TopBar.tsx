import React from 'react';

export type WorkspaceTab = 'game' | 'film' | 'media' | 'grounding' | 'director';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onToggleDemo: () => void;
  demoActive: boolean;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'game', label: 'Mission Game' },
  { id: 'film', label: 'Concept Film' },
  { id: 'media', label: 'Scene Studio' },
  { id: 'grounding', label: 'Atlas & Terrain' },
  { id: 'director', label: 'Director & Audio' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onToggleDemo,
  demoActive,
}) => {
  return (
    <header className="border-b border-slate-800 bg-[#07090E]/95 backdrop-blur-sm md:sticky md:top-0 md:z-30">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-3 sm:px-6 md:flex-nowrap">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('game');
          }}
          className="order-1 font-display text-base font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
        >
          Rocket Academy
        </a>

        <nav
          aria-label="Primary workspace navigation"
          className="order-3 flex w-full items-center justify-between gap-4 overflow-x-auto border-t border-slate-800/80 pt-2 md:order-2 md:w-auto md:justify-center md:gap-6 md:border-t-0 md:pt-0"
        >
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400 ${
                  active
                    ? 'text-cyan-400'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[9px] h-0.5 bg-cyan-400 md:-bottom-[13px]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="order-2 shrink-0 md:order-3">
          <button
            type="button"
            onClick={onToggleDemo}
            className={`rounded-md px-4 py-2 text-xs font-semibold tracking-wide transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
              demoActive
                ? 'border border-cyan-500/50 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            }`}
          >
            {demoActive ? 'Exit Demo' : 'Start Guided Demo'}
          </button>
        </div>
      </div>
    </header>
  );
};
