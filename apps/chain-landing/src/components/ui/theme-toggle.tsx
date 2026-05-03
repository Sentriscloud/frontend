"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

// useSyncExternalStore-based mount detection — equivalent to the classic
// useState+useEffect pattern but lint-clean under React 19's
// react-hooks/set-state-in-effect rule. Server snapshot is false, client
// resolves true on subscribe — same hydration-safe behavior.
const subscribeMount = () => () => {};
const getMountSnapshot = () => true;
const getMountServerSnapshot = () => false;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeMount,
    getMountSnapshot,
    getMountServerSnapshot,
  );

  if (!mounted) return <div className="w-10 h-10" />;

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="w-10 h-10 rounded-full border border-[var(--brd)] flex items-center justify-center transition-all duration-300 hover:border-[var(--brd2)] hover:bg-[rgba(200,168,74,.05)] cursor-pointer shrink-0"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <svg className="w-4 h-4 stroke-[var(--gold)] transition-transform duration-400 hover:rotate-[30deg]" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg className="w-4 h-4 stroke-[var(--gold)] transition-transform duration-400 hover:rotate-[30deg]" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
