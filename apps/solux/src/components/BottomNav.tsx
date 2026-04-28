'use client';

import { Home, ListOrdered, Users, Settings as SettingsIcon } from 'lucide-react';

export type NavTab = 'home' | 'activity' | 'settings';

interface Props {
  active: NavTab;
  onTab: (tab: NavTab) => void;
  onSocial: () => void;
}

export default function BottomNav({ active, onTab, onSocial }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="max-w-sm mx-auto px-3 pb-3 pointer-events-auto">
        <div className="nav-floating relative h-[60px] rounded-[20px] grid grid-cols-4 items-stretch">
          <Tab icon={<Home className="w-[18px] h-[18px]" />}        label="Home"     active={active === 'home'}     onClick={() => onTab('home')} />
          <Tab icon={<Users className="w-[18px] h-[18px]" />}       label="Social"   active={false}                 onClick={onSocial} soon />
          <Tab icon={<ListOrdered className="w-[18px] h-[18px]" />} label="Activity" active={active === 'activity'} onClick={() => onTab('activity')} />
          <Tab icon={<SettingsIcon className="w-[18px] h-[18px]" />} label="Settings" active={active === 'settings'} onClick={() => onTab('settings')} />
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
      className={`relative flex flex-col items-center justify-center gap-1 transition-colors ${
        active ? 'text-[var(--gold)]' : 'text-[var(--tx-d)] hover:text-[var(--tx-m)]'
      }`}
    >
      {soon && (
        <span className="absolute top-3 right-1/2 translate-x-3.5 w-1 h-1 rounded-full bg-[var(--gold)]" />
      )}
      {icon}
      <span className="text-[10px]">{label}</span>
    </button>
  );
}
