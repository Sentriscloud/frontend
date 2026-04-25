import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Wrapped Link / useRouter / usePathname / redirect — preserve locale prefix automatically.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
