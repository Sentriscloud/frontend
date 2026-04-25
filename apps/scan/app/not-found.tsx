import Link from "next/link";

// DECISION: secondary safety net for requests that bypass the i18n middleware (malformed URLs,
// non-locale paths). Mirrors the branded 404 from [locale]/not-found.tsx but without i18n
// translations so it works standalone.
export default function RootNotFound() {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        style={{
          background: "#0c0c10",
          color: "#EADBA0",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Sora', system-ui, sans-serif",
          padding: "2rem",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 560 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 28 }}>
            <span style={{ width: 40, height: 1, background: "#C8A84A" }} />
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C8A84A" }} />
            <span style={{ width: 40, height: 1, background: "#C8A84A" }} />
          </div>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "#908a7e", margin: 0 }}>
            Not Found
          </p>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 300,
              fontSize: "clamp(96px, 14vw, 200px)",
              lineHeight: 1,
              letterSpacing: ".04em",
              color: "#C8A84A",
              margin: "28px 0",
            }}
          >
            4<span style={{ color: "#F0D080", fontWeight: 400 }}>0</span>4
          </h1>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 300, color: "#908a7e", margin: "0 0 16px" }}>
            This chain has no such block.
          </p>
          <p style={{ fontSize: 13, color: "#58566a", fontWeight: 300, maxWidth: 420, margin: "0 auto 32px" }}>
            The page you requested could not be found.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 36,
              padding: "0 20px",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: ".15em",
              textTransform: "uppercase",
              borderRadius: 9999,
              background: "#C8A84A",
              color: "#0c0c10",
              textDecoration: "none",
            }}
          >
            Back home
          </Link>
        </div>
      </body>
    </html>
  );
}
