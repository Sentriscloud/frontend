"use client";

import { Moon, Sun } from "lucide-react";
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
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeMount,
    getMountSnapshot,
    getMountServerSnapshot,
  );

  if (!mounted) {
    return <div className="h-9 w-9" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="hairline inline-flex h-9 w-9 items-center justify-center rounded-full text-(--color-ink-3) hover:text-(--color-ink)"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
