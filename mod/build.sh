#!/usr/bin/env bash
# Builds the Galaxy GUI Crosshair mod (Forge 1.8.9) without ForgeGradle:
# downloads the 1.8.9 client, MCP SRG mappings, Forge universal and SpecialSource, remaps the client and Forge
# to SRG names, compiles the mod for Java 8 against them, and packs the jar into ../dist.
set -euo pipefail
cd "$(dirname "$0")"
DEPS=${DEPS:-build/deps}; OUT=build/classes; mkdir -p "$DEPS" "$OUT" ../dist
M=https://maven.minecraftforge.net
get() { [ -s "$DEPS/$2" ] || curl -sSfL --retry 3 -o "$DEPS/$2" "$1"; }
get "$M/de/oceanlabs/mcp/mcp/1.8.9/mcp-1.8.9-srg.zip" mcp-srg.zip
get "$M/net/minecraftforge/forge/1.8.9-11.15.1.2318-1.8.9/forge-1.8.9-11.15.1.2318-1.8.9-universal.jar" forge.jar
get "$M/net/md-5/SpecialSource/1.7.4/SpecialSource-1.7.4-shaded.jar" specialsource.jar
if [ ! -s "$DEPS/client.jar" ]; then
  V=$(curl -sSf https://launchermeta.mojang.com/mc/game/version_manifest.json | python3 -c "import json,sys; print([v['url'] for v in json.load(sys.stdin)['versions'] if v['id']=='1.8.9'][0])")
  C=$(curl -sSf "$V" | python3 -c "import json,sys; print(json.load(sys.stdin)['downloads']['client']['url'])")
  curl -sSfL -o "$DEPS/client.jar" "$C"
fi
[ -s "$DEPS/joined.srg" ] || unzip -p "$DEPS/mcp-srg.zip" joined.srg > "$DEPS/joined.srg"
for j in client forge; do [ -s "$DEPS/$j-srg.jar" ] || java -jar "$DEPS/specialsource.jar" --in-jar "$DEPS/$j.jar" --out-jar "$DEPS/$j-srg.jar" --srg-in "$DEPS/joined.srg"; done
rm -rf "$OUT" && mkdir -p "$OUT"
javac --release 8 -nowarn -cp "$DEPS/client-srg.jar:$DEPS/forge-srg.jar" -d "$OUT" $(find src/main/java -name '*.java')
cp src/main/resources/mcmod.info "$OUT/"
(cd "$OUT" && jar --create --file ../../../dist/GalaxyGUI-Crosshair-1.0-1.8.9.jar .)
echo "built dist/GalaxyGUI-Crosshair-1.0-1.8.9.jar"
