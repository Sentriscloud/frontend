import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

// DECISION: matcher excludes static files, _next internals, the Next.js metadata routes
// (icon/apple-icon/opengraph-image/manifest/robots/sitemap), and any path containing a file
// extension. Only real UI routes get locale-prefixed.
export const config = {
  matcher: [
    "/((?!api|_next|_vercel|icon|apple-icon|opengraph-image|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|favicon\\.ico|.*\\..*).*)",
  ],
};
