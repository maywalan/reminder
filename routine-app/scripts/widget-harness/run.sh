#!/bin/zsh
# Builds the widget harness against targets/widget's sources, installs it on the booted simulator
# and saves a screenshot per page (1: large + empty medium, 2: medium + smalls, 3: lock screen).
# Usage: scripts/widget-harness/run.sh [out-dir]   (default: /tmp/tickle-widget-harness)
set -euo pipefail
HERE=${0:A:h}
W=$HERE/../../targets/widget
OUT=${1:-/tmp/tickle-widget-harness}
B=$(mktemp -d)
mkdir -p $B/src $B/Harness.app $OUT
cp $W/TickleCalendarData.swift $W/TickleCalendarWidgets.swift $HERE/Harness.swift $B/src/
# TickleWidget.swift holds the shared helpers (TickleL10n, Font.anuphan, Color(hex:)) — drop its @main bundle.
sed '/^@main/,$d' $W/TickleWidget.swift > $B/src/TickleWidget.swift
cp $W/*.ttf $HERE/Info.plist $B/Harness.app/
xcrun -sdk iphonesimulator swiftc -target $(uname -m)-apple-ios17.0-simulator -parse-as-library -O $B/src/*.swift -o $B/Harness.app/Harness
codesign -s - --force $B/Harness.app >/dev/null
xcrun simctl install booted $B/Harness.app
for p in 1 2 3; do
  xcrun simctl terminate booted com.maywalan.tickle.widgetharness 2>/dev/null || true
  xcrun simctl launch booted com.maywalan.tickle.widgetharness -page $p >/dev/null
  sleep 4
  xcrun simctl io booted screenshot $OUT/page$p.png >/dev/null 2>&1
done
echo "Screenshots in $OUT"
