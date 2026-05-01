#!/usr/bin/env bash
# indexnow-submit.sh — push URL changes to IndexNow (Bing + Yandex).
#
# Usage:
#   ./indexnow-submit.sh                       # auto-discovers URLs from sitemap.xml
#   ./indexnow-submit.sh URL [URL ...]         # submit specific URLs only
#
# Examples:
#   ./indexnow-submit.sh
#   ./indexnow-submit.sh https://sentrixchain.com/en https://sentrixchain.com/id
#
# Run after shipping any landing-page or docs change. ~1s round trip.
set -euo pipefail

HOST="sentrixchain.com"
KEY="ffc3faea841143fa9afeb70a7806e5b8"
KEY_LOCATION="https://${HOST}/${KEY}.txt"
SITEMAP_URL="https://${HOST}/sitemap.xml"
INDEXNOW_API="https://api.indexnow.org/IndexNow"

# 1. Build the URL list — args override sitemap discovery.
if [ "$#" -gt 0 ]; then
    urls=("$@")
else
    echo "==> discovering URLs from ${SITEMAP_URL}"
    mapfile -t urls < <(curl -sS --max-time 10 "$SITEMAP_URL" | grep -oP '(?<=<loc>)[^<]+(?=</loc>)')
    if [ "${#urls[@]}" -eq 0 ]; then
        echo "ERROR: no URLs found in sitemap" >&2
        exit 1
    fi
fi

echo "==> submitting ${#urls[@]} URL(s):"
printf '    %s\n' "${urls[@]}"

# 2. Build JSON payload — proper quoting via jq if available, else printf fallback.
if command -v jq >/dev/null 2>&1; then
    payload=$(jq -n \
        --arg host "$HOST" \
        --arg key "$KEY" \
        --arg keyLocation "$KEY_LOCATION" \
        --argjson urlList "$(printf '%s\n' "${urls[@]}" | jq -R . | jq -s .)" \
        '{host: $host, key: $key, keyLocation: $keyLocation, urlList: $urlList}')
else
    # Manual JSON — safe because URLs in the sitemap are pre-validated.
    url_json=$(printf '"%s",' "${urls[@]}")
    url_json="[${url_json%,}]"
    payload=$(cat <<EOF
{"host":"${HOST}","key":"${KEY}","keyLocation":"${KEY_LOCATION}","urlList":${url_json}}
EOF
)
fi

# 3. POST and capture status.
echo "==> POST ${INDEXNOW_API}"
status=$(curl -sS -X POST "$INDEXNOW_API" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d "$payload" \
    -o /tmp/indexnow-body.$$ \
    -w "%{http_code}")

case "$status" in
    200|202)
        echo "==> HTTP $status — submitted (202 = key validation pending, 200 = validated)"
        rm -f /tmp/indexnow-body.$$
        exit 0
        ;;
    400)
        echo "==> HTTP 400 — bad request (malformed JSON or invalid URLs)"
        cat /tmp/indexnow-body.$$ 2>/dev/null
        rm -f /tmp/indexnow-body.$$
        exit 1
        ;;
    403)
        echo "==> HTTP 403 — key validation failed. Check ${KEY_LOCATION} returns 200 with body matching the key."
        rm -f /tmp/indexnow-body.$$
        exit 1
        ;;
    422)
        echo "==> HTTP 422 — URLs do not match host. Each URL must start with https://${HOST}/."
        cat /tmp/indexnow-body.$$ 2>/dev/null
        rm -f /tmp/indexnow-body.$$
        exit 1
        ;;
    429)
        echo "==> HTTP 429 — rate limited. Wait and retry."
        rm -f /tmp/indexnow-body.$$
        exit 1
        ;;
    *)
        echo "==> HTTP $status — unexpected"
        cat /tmp/indexnow-body.$$ 2>/dev/null
        rm -f /tmp/indexnow-body.$$
        exit 1
        ;;
esac
