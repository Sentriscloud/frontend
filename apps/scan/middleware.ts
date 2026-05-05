import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

// DECISION: matcher excludes static files, _next internals, the Next.js metadata routes
// (icon/apple-icon/opengraph-image/manifest/robots/sitemap), and any path containing a file
// extension. Only real UI routes get locale-prefixed.
//
// Note the trailing slash on `api/` — without it the bare `api`-prefix lookahead also
// excluded `/api-docs` (a real UI page), which then 404'd on bare access while
// `/en/api-docs` worked. With `api/` only actual `/api/*` REST routes skip i18n.
export const config = {
  matcher: [
    "/((?!api/|_next|_vercel|icon|apple-icon|opengraph-image|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|favicon\\.ico|.*\\..*).*)",
  ],
};
