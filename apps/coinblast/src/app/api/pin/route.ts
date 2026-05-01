// Server-side proxy that forwards a multipart upload from /create to
// Pinata's pinFileToIPFS endpoint. The JWT lives in PINATA_JWT (read
// from .env.production.local on the host) and never crosses the
// browser boundary. Browser → /api/pin → Pinata; we return only the
// resulting CID + a public-gateway URL the user can share.
//
// Why we hand-build the multipart body instead of using FormData:
// Pinata's parser is strict about how the pinataOptions / pinataMetadata
// fields arrive. Plain string fields are silently ignored (the JSON is
// treated as raw text). FormData Blobs get tagged with a synthetic
// filename, which Pinata then rejects with "Unexpected field" because
// it expects those fields to NOT be file fields. The right shape is a
// string-typed field with an explicit `Content-Type: application/json`
// header — exactly what curl's `-F 'name=val;type=application/json'`
// emits — and that's what we build below by hand.

import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

interface PinataPinResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

function randomBoundary(): string {
  // 32 hex chars is plenty; matches the form-data convention.
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return (
    "----coinblastpin" +
    Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("")
  );
}

export async function POST(req: NextRequest) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return NextResponse.json(
      { error: "Pinata not configured (PINATA_JWT missing on server)" },
      { status: 503 },
    );
  }

  const incoming = await req.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing `file` field in multipart upload" },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES} bytes)` },
      { status: 413 },
    );
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported MIME type: ${file.type}` },
      { status: 415 },
    );
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const filename = file.name || "coin-image";
  const fileMime = file.type || "application/octet-stream";

  // pinataMetadata.name is plain — a slash here makes Pinata interpret
  // the upload as a directory path and silently wrap the file in a
  // UnixFS dir, regardless of pinataOptions.wrapWithDirectory. The
  // resulting CID then resolves to an HTML directory-listing page on
  // public gateways instead of streaming the raw image. Bug discovered
  // 2026-05-02. We tag the source via keyvalues, not the name.
  const pinataMetadata = JSON.stringify({
    name: filename,
    keyvalues: {
      source: "coinblast",
      uploadedAt: new Date().toISOString(),
    },
  });
  const pinataOptions = JSON.stringify({
    cidVersion: 1,
    wrapWithDirectory: false,
  });

  // Hand-built multipart body. Each part begins with `--<boundary>`,
  // its headers, a blank line, then the body. The terminator is
  // `--<boundary>--`.
  const boundary = randomBoundary();
  const enc = new TextEncoder();
  const filePart = enc.encode(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename.replace(/"/g, "")}"\r\n` +
      `Content-Type: ${fileMime}\r\n\r\n`,
  );
  const fileSep = enc.encode("\r\n");
  const metaPart = enc.encode(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="pinataMetadata"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      pinataMetadata +
      `\r\n`,
  );
  const optsPart = enc.encode(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="pinataOptions"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      pinataOptions +
      `\r\n`,
  );
  const tail = enc.encode(`--${boundary}--\r\n`);

  const total =
    filePart.length +
    fileBytes.length +
    fileSep.length +
    metaPart.length +
    optsPart.length +
    tail.length;
  const body = new Uint8Array(total);
  let off = 0;
  body.set(filePart, off);
  off += filePart.length;
  body.set(fileBytes, off);
  off += fileBytes.length;
  body.set(fileSep, off);
  off += fileSep.length;
  body.set(metaPart, off);
  off += metaPart.length;
  body.set(optsPart, off);
  off += optsPart.length;
  body.set(tail, off);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[pin] upstream error", res.status, detail);
    return NextResponse.json(
      { error: `Pinata upload failed (${res.status})` },
      { status: 502 },
    );
  }

  const json = (await res.json()) as PinataPinResponse;
  if (!json.IpfsHash) {
    return NextResponse.json(
      { error: "Pinata returned no IpfsHash" },
      { status: 502 },
    );
  }

  const gateway =
    process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";

  return NextResponse.json({
    cid: json.IpfsHash,
    uri: `ipfs://${json.IpfsHash}`,
    url: `${gateway.replace(/\/$/, "")}/${json.IpfsHash}`,
    size: json.PinSize,
  });
}

export async function GET() {
  return NextResponse.json(
    { error: "POST a multipart `file` field" },
    { status: 405 },
  );
}
