// Server entry — opts the route out of static prerendering. The actual
// content lives in a client component (HomeContent) loaded behind a
// mounted-gate so wagmi's hooks + browser globals (indexedDB, window) only
// touch the page after hydration.

export const dynamic = "force-dynamic";

import { ClientShell } from "./ClientShell";

export default function Page() {
  return <ClientShell />;
}
