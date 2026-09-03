import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * The Tickle draft-2 motion library (design_handoff_tickle_draft2/README.md, "Motion" section —
 * source keyframes in the design file's section 07). 14 named curves, reproduced here as
 * Reanimated-free `Animated` hooks per the handoff's own porting note ("`@keyframes` → Reanimated
 * or `Animated`"). Everything drives only `transform`/`opacity` so it stays on the native thread
 * (`useNativeDriver: true`).
 *
 * Rules from the design file: idle loops run 3-4s, reactions 1.4-2.6s, one-shots under 2s;
 * everything eases `ease-in-out` except `burst` (`ease-out`). A single Tickle should run at most
 * one body motion plus one bubble motion at a time — never two of either.
 */

const EASE = Easing.inOut(Easing.ease);

/**
 * Shared driver for every simple "rest -> peak -> rest" loop (breathe, bob, float, hop, sink,
 * pulse, pop). `peakPercent` matches the keyframe's peak offset (most are 50%; hop is 38%, pop is
 * 22%) so the up/down legs run at the right relative speed instead of a generic symmetric ease.
 */
function useLoopPhase(totalMs: number, peakPercent: number, enabled: boolean) {
  const phase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) {
      phase.setValue(0);
      return;
    }
    const upMs = (totalMs * peakPercent) / 100;
    const downMs = totalMs - upMs;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, { toValue: 1, duration: upMs, easing: EASE, useNativeDriver: true }),
        Animated.timing(phase, { toValue: 0, duration: downMs, easing: EASE, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, totalMs, peakPercent, phase]);

  return phase;
}

/** breathe — 4s, scale(1.035, .985) at the peak. Idle body motion for every Tickle. */
export function useBreathe(enabled = true) {
  const phase = useLoopPhase(4000, 50, enabled);
  return {
    transform: [
      { scaleX: phase.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) },
      { scaleY: phase.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }) },
    ],
  };
}

/** bob — 3.2s, +4px. Body motion for a Tickle sitting inside a card. */
export function useBob(enabled = true) {
  const phase = useLoopPhase(3200, 50, enabled);
  return { transform: [{ translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) }] };
}

/** sink — 3s, +3px. Body motion for empty states (paired with the bubble's `drift`). */
export function useSink(enabled = true) {
  const phase = useLoopPhase(3000, 50, enabled);
  return { transform: [{ translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) }] };
}

/** float — 4s, -4px. Idle bubble motion. */
export function useFloat(enabled = true) {
  const phase = useLoopPhase(4000, 50, enabled);
  return { transform: [{ translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] };
}

/** hop — 2.6s, -7px, peak at 38%. Bubble motion when something is due. */
export function useHop(enabled = true) {
  const phase = useLoopPhase(2600, 38, enabled);
  return { transform: [{ translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }] };
}

/** pulse — 1.6s, scale 1.2 / opacity .7 at the peak. Live dot, text caret, a "running" bubble. */
export function usePulse(enabled = true, durationMs = 1600) {
  const phase = useLoopPhase(durationMs, 50, enabled);
  return {
    opacity: phase.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }),
    transform: [{ scale: phase.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
  };
}

/** pop — 2.4s, scale 1.06, peak at 22%. A row/value that just changed. */
export function usePop(enabled = true) {
  const phase = useLoopPhase(2400, 22, enabled);
  return { transform: [{ scale: phase.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] };
}

/**
 * blink — 6s. Holds open, dips to a near-closed scaleY(.12) at 96.5%, reopens by 100%. Both eyes
 * share one clock (pass the same hook result to both).
 */
export function useBlink(enabled = true, durationMs = 6000) {
  const value = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!enabled) {
      value.setValue(1);
      return;
    }
    const holdMs = durationMs * 0.93;
    const closeMs = durationMs * 0.035;
    const openMs = durationMs * 0.035;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: holdMs, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.12, duration: closeMs, easing: EASE, useNativeDriver: true }),
        Animated.timing(value, { toValue: 1, duration: openMs, easing: EASE, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, durationMs, value]);

  return { transform: [{ scaleY: value }] };
}

/**
 * tilt — 3s. Rests at -7deg, nudges to -12deg at 82%, back to -7deg by 100%. Bell-icon nudge (a
 * permission ask); not used by Tickle itself.
 */
export function useTilt(enabled = true) {
  const deg = useRef(new Animated.Value(-7)).current;

  useEffect(() => {
    if (!enabled) {
      deg.setValue(-7);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(deg, { toValue: -7, duration: 3000 * 0.68, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(deg, { toValue: -12, duration: 3000 * 0.14, easing: EASE, useNativeDriver: true }),
        Animated.timing(deg, { toValue: -7, duration: 3000 * 0.18, easing: EASE, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, deg]);

  return { transform: [{ rotate: deg.interpolate({ inputRange: [-12, -7], outputRange: ['-12deg', '-7deg'] }) }] };
}

/**
 * tap — 2.2s. The "shoulder tap": bubble drops 8px, up, drops again, up, then rests — a double
 * knock. Bubble motion for a permission ask or a recap preview.
 */
export function useTap(enabled = true) {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) {
      y.setValue(0);
      return;
    }
    const total = 2200;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 8, duration: total * 0.18, easing: EASE, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: total * 0.16, easing: EASE, useNativeDriver: true }),
        Animated.timing(y, { toValue: 8, duration: total * 0.14, easing: EASE, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: total * 0.1, easing: EASE, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: total * 0.42, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, y]);

  return { transform: [{ translateY: y }] };
}

/**
 * squash — 2.6s. Body motion for a completion moment / onboarding step 3: overshoots wide+short
 * at 28%, settles narrow+tall at 58%, rests by 100%.
 */
export function useSquash(enabled = true) {
  const x = useRef(new Animated.Value(1)).current;
  const yScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!enabled) {
      x.setValue(1);
      yScale.setValue(1);
      return;
    }
    const total = 2600;
    const legs = [total * 0.28, total * 0.3, total * 0.42];
    const runAxis = (v: Animated.Value, stops: number[]) =>
      Animated.loop(
        Animated.sequence(
          stops.map((toValue, i) => Animated.timing(v, { toValue, duration: legs[i], easing: EASE, useNativeDriver: true }))
        )
      );
    const loopX = runAxis(x, [1.07, 0.98, 1]);
    const loopY = runAxis(yScale, [0.93, 1.02, 1]);
    loopX.start();
    loopY.start();
    return () => {
      loopX.stop();
      loopY.stop();
    };
  }, [enabled, x, yScale]);

  return { transform: [{ scaleX: x }, { scaleY: yScale }] };
}

/**
 * drift — 3.6s, symmetric. Bubble motion paired with `sink` for empty/greyed-out states: drifts
 * right+up while fading, then back.
 */
export function useDrift(enabled = true) {
  const phase = useLoopPhase(3600, 50, enabled);
  return {
    opacity: phase.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.55] }),
    transform: [
      { translateX: phase.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) },
      { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
    ],
  };
}

/**
 * think — 1.4s per dot, 160ms stagger between the 3 dots. Replaces every loading spinner in the
 * product. Returns one style per dot; render 3 small circles with these.
 */
export function useThink(enabled = true) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    if (!enabled) {
      dots.forEach((d) => d.setValue(0));
      return;
    }
    const total = 1400;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const loops = dots.map((d) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(d, { toValue: 1, duration: total * 0.4, easing: EASE, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: total * 0.6, easing: EASE, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((loop, i) => {
      const t = setTimeout(() => loop.start(), i * 160);
      timers.push(t);
    });
    return () => {
      timers.forEach(clearTimeout);
      loops.forEach((loop) => loop.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return dots.map((d) => ({
    opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
    transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
  }));
}

/**
 * burst — 1.8s, one-shot, ease-out (the only curve that isn't ease-in-out). Completion confetti:
 * scales up from nothing while rising and fading in, then holds near-opaque. Call `fire()` to play
 * it once; safe to call again mid-flight, it restarts from the beginning.
 */
export function useBurst() {
  const value = useRef(new Animated.Value(0)).current;

  function fire() {
    value.setValue(0);
    Animated.timing(value, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  }

  const style = {
    opacity: value.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 0.9] }),
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [7, -5] }) },
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
    ],
  };

  return { style, fire };
}
