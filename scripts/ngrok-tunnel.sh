#!/usr/bin/env bash
# Tunnel the Next.js dev server (default port 3000) with HTTP Basic Auth.
# Uses ngrok Traffic Policy so paths under `/_next/*` skip Basic Auth — that avoids the
# browser re-prompt loop caused by HMR / chunks + global `--basic-auth` (deprecated).
#
# Requires ngrok: https://ngrok.com — run `ngrok config add-authtoken …` once.
#
# Usage:
#   export TUNNEL_HTTP_PASSWORD='your-strong-secret'
#   ./scripts/ngrok-tunnel.sh
#
# Optional:
#   TUNNEL_PORT=3000
#   TUNNEL_HTTP_USER=burndemo

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${TUNNEL_PORT:-3000}"
export TUNNEL_HTTP_USER="${TUNNEL_HTTP_USER:-burndemo}"

if [[ -z "${TUNNEL_HTTP_PASSWORD:-}" ]]; then
  echo "Set TUNNEL_HTTP_PASSWORD to a strong secret, e.g.:" >&2
  echo "  export TUNNEL_HTTP_PASSWORD='...'" >&2
  echo "  $ROOT/scripts/ngrok-tunnel.sh" >&2
  exit 1
fi

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok not found. Install from https://ngrok.com and add it to PATH." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to write the traffic policy JSON." >&2
  exit 1
fi

POLICY_FILE="$(mktemp "${TMPDIR:-/tmp}/ngrok-burnout-policy.XXXXXX.json")"
trap 'rm -f "$POLICY_FILE"' EXIT

export TUNNEL_HTTP_PASSWORD
python3 <<'PY' >"$POLICY_FILE"
import json, os

# ngrok expects credentials as "user:pass" strings (not username/password objects).
# See: https://ngrok.com/docs/traffic-policy/actions/basic-auth
user = os.environ["TUNNEL_HTTP_USER"]
pw = os.environ["TUNNEL_HTTP_PASSWORD"]
pair = f"{user}:{pw}"

policy = {
    "on_http_request": [
        {
            "expressions": ['!req.url.path.startsWith("/_next")'],
            "actions": [
                {
                    "type": "basic-auth",
                    "config": {
                        "credentials": [pair],
                    },
                }
            ],
        }
    ]
}
print(json.dumps(policy, indent=2))
PY

cd "$ROOT"
ngrok http "$PORT" --traffic-policy-file="$POLICY_FILE"
