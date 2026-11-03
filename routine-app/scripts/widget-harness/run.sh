#!/bin/zsh
# Builds the widget harness against targets/widget's sources, installs it on the booted simulator
# and saves a screenshot per page (1: large + empty medium, 2: medium + smalls, 3: lock screen).
# Usage: scripts/widget-harness/run.sh [out-dir]   (default: /tmp/tickle-widget-harness)
#        REAL=1 scripts/widget-harness/run.sh   draws the app's real App Group data + language instead of samples
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
if [[ -n ${REAL:-} ]]; then
  # The sim ignores an ad-hoc App Group entitlement, so copy what the app last synced into the
  # harness's own prefs — UserDefaults(suiteName:) without the group reads that same file name.
  APP_GROUP=$(xcrun simctl get_app_container booted com.maywalan.tickle groups | awk '/group.com.maywalan.tickle/ {print $2}')
  H_PREFS=$(xcrun simctl get_app_container booted com.maywalan.tickle.widgetharness data)/Library/Preferences
  mkdir -p $H_PREFS
  cp $APP_GROUP/Library/Preferences/group.com.maywalan.tickle.plist $H_PREFS/
fi
for p in 1 2 3; do
  xcrun simctl terminate booted com.maywalan.tickle.widgetharness 2>/dev/null || true
  xcrun simctl launch booted com.maywalan.tickle.widgetharness -page $p ${=REAL:+-real YES} >/dev/null
  sleep 4
  xcrun simctl io booted screenshot $OUT/page$p.png >/dev/null 2>&1
done
echo "Screenshots in $OUT"
