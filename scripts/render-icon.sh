#!/usr/bin/env bash
# Render assets/icon.svg into the files we ship and upload:
#   assets/curseforge-logo.png  400x400 PNG for the CurseForge project logo
#   addon/icon.tga              64x64 32-bit TGA for the in-game addon list
# Only needed when the icon changes. Needs Chrome/Chromium and Python 3 with Pillow.
#   CHROME=/path/to/chrome scripts/render-icon.sh
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${CHROME:-$(command -v chromium || command -v google-chrome || command -v chrome || true)}"
if [ -z "$CHROME" ]; then
  echo "Set CHROME to a Chrome or Chromium binary." >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cat > "$tmp/icon.html" <<HTML
<!doctype html><html><head><style>html,body{margin:0;background:transparent}img{display:block;width:512px;height:512px}</style></head>
<body><img src="file://$PWD/assets/icon.svg"></body></html>
HTML

"$CHROME" --headless --no-sandbox --hide-scrollbars --default-background-color=00000000 \
  --window-size=512,512 --screenshot="$tmp/icon-512.png" "file://$tmp/icon.html" >/dev/null 2>&1

python3 - "$tmp/icon-512.png" <<'PY'
import sys
from PIL import Image
icon = Image.open(sys.argv[1]).convert("RGBA")
icon.resize((400, 400), Image.LANCZOS).save("assets/curseforge-logo.png", optimize=True)
icon.resize((64, 64), Image.LANCZOS).save("addon/icon.tga")
print("wrote assets/curseforge-logo.png and addon/icon.tga")
PY
