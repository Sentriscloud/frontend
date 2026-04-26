'use client';

import { Home, ListOrdered, Users, Settings as SettingsIcon } from 'lucide-react';

export type NavTab = 'home' | 'activity' | 'settings';

interface Props {
  active: NavTab;
  onTab: (tab: NavTab) => void;
  onSocial: () => void;
}

/**
 * Persistent bottom navigation. Flat 4-slot layout:
 *   Home / Social (coming soon) / Activity / Settings
 *
 * Settings owns the merged Profile + Settings page (avatar, address, QR,
 * preferences, security). Send/Receive/Stake live in the Home action grid;
 * no raised FAB — keeping the nav low-profile.
 */
export default function BottomNav({ active, onTab, onSocial }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="max-w-sm mx-auto px-3 pb-3 pointer-events-auto">
        <div className="h-16 rounded-2xl bg-[var(--sf)] border border-[var(--brd-s)] grid grid-cols-4 items-stretch shadow-[0_-12px_36px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <Tab icon={<Home className="w-4 h-4" />}        label="Home"     active={active === 'home'}     onClick={() => onTab('home')} />
          <Tab icon={<Users className="w-4 h-4" />}       label="Social"   active={false}                 onClick={onSocial} soon />
          <Tab icon={<ListOrdered className="w-4 h-4" />} label="Activity" active={active === 'activity'} onClick={() => onTab('activity')} />
          <Tab icon={<SettingsIcon className="w-4 h-4" />} label="Settings" active={active === 'settings'} onClick={() => onTab('settings')} />
        </div>
      </div>
    </nav>
  );
}

function Tab({
  icon, label, active, onClick, soon,
}: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; soon?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-0.5 transition-colors ${
        active ? 'text-[var(--gold)]' : 'text-[var(--tx-d)] hover:text-[var(--tx-m)]'
      }`}
    >
      {soon && (
        <span className="absolute top-2 right-1/2 translate-x-3 w-1.5 h-1.5 rounded-full bg-[var(--gold)]" />
      )}
      {icon}
      <span className="text-[9px] font-mono uppercase tracking-wider">{label}</span>
    </button>
  );
}
