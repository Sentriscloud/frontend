'use client';

import { Home, ListOrdered, Users, Settings as SettingsIcon } from 'lucide-react';

export type NavTab = 'home' | 'activity' | 'settings';

interface Props {
  active: NavTab;
  onTab: (tab: NavTab) => void;
  onSocial: () => void;
}

const TABS: ReadonlyArray<{ key: 'home' | 'social' | 'activity' | 'settings'; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'home',     label: 'Home',     icon: Home },
  { key: 'social',   label: 'Social',   icon: Users },
  { key: 'activity', label: 'Activity', icon: ListOrdered },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function BottomNav({ active, onTab, onSocial }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="max-w-sm mx-auto px-3 pb-3 pointer-events-auto">
        <div className="nav-floating relative h-[60px] rounded-[20px] grid grid-cols-4 items-stretch p-1 gap-1">
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive =
              (key === 'home'     && active === 'home') ||
              (key === 'activity' && active === 'activity') ||
              (key === 'settings' && active === 'settings');
            const isSoon = key === 'social';
            return (
              <button
                key={key}
                onClick={() => {
                  if (key === 'social') onSocial();
                  else onTab(key);
                }}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors ${
                  isActive
                    ? 'bg-[var(--gold-bg)] text-[var(--gold)]'
                    : 'text-[var(--tx-d)] hover:text-[var(--tx-m)]'
                }`}
              >
                {isSoon && (
                  <span className="absolute top-2 right-1/2 translate-x-3.5 w-1 h-1 rounded-full bg-[var(--gold)]" />
                )}
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[10px] font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
