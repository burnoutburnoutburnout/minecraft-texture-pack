#!/usr/bin/env bash
# Rebuilds studio/galaxy-gui-studio.html from the pieces in studio/src (order matters).
set -euo pipefail
cd "$(dirname "$0")/src"
cat head.html core1.js mid.js steak.js photo.js pan.js smooth.js slab.js elements.js gh.js ui.js png.js themes.js tail.js build.js > ../galaxy-gui-studio.html
echo "built studio/galaxy-gui-studio.html ($(wc -c < ../galaxy-gui-studio.html) bytes)"
