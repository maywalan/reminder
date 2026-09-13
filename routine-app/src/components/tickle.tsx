import { LinearGradient } from 'expo-linear-gradient';
import { Animated, View } from 'react-native';

import { useBlink, useBreathe, useDrift, useFloat, useHop, usePulse, useSink } from '@/utils/motion';

export type TickleMood = 'idle' | 'live' | 'due' | 'off';

/** Bubble color per mood — azure idle, green while a session runs, amber when something's due, grey when there's nothing to do. */
const BUBBLE_COLOR: Record<TickleMood, string> = {
  idle: '#1B76E8',
  live: '#4FC98A',
  due: '#F0A32E',
  off: '#B7C0D1',
};

/**
 * Per-mood body + bubble motion pairing (design_handoff_tickle_draft2/README.md, "Motion"
 * section). A Tickle runs exactly one body animation plus one bubble animation at a time.
 * idle -> breathe body, float bubble · live -> breathe body, pulse bubble · due -> breathe body,
 * hop bubble (something's due) · off -> sink body, drift bubble (empty state).
 */
const BODY_MOTION: Record<TickleMood, 'breathe' | 'sink'> = { idle: 'breathe', live: 'breathe', due: 'breathe', off: 'sink' };
const BUBBLE_MOTION: Record<TickleMood, 'float' | 'pulse' | 'hop' | 'drift'> = { idle: 'float', live: 'pulse', due: 'hop', off: 'drift' };

/**
 * Geometry ratios lifted directly from the design file's 34pt header instance
 * (design_handoff_tickle_draft2/Tickle draft 2.dc.html, the `11a`/`11b` home mockups — a 34x34
 * container with an absolutely-positioned body, eyes, mouth and bubble, not a full-bleed square
 * body with the bubble stacked above it). The body is noticeably smaller than its container and
 * inset toward the bottom-left; the bubble overlaps its top-right corner. All fractions are of
 * `size` (the container's width == height) unless noted.
 */
const G = {
  bodyWidth: 27 / 34,
  bodyHeight: 23 / 34,
  bodyLeft: 2 / 34,
  bodyTop: 10 / 34,
  bodyRadiusTop: 14 / 34,
  bodyRadiusBottom: 12 / 34,
  eyeSize: 5 / 34,
  eyeLeft1: 9 / 34,
  eyeLeft2: 18 / 34,
  eyeTop: 19 / 34,
  bubbleSize: 7 / 34,
  bubbleLeft: 24 / 34,
  bubbleTop: 2 / 34,
  // Mouth never appears at 34pt (drops below 40pt) — these ratios are of body width/height
  // instead, extrapolated from the 132pt splash instance, the only one with both eyes and mouth.
  mouthWidthOfBody: 16 / 92,
  mouthHeightOfBody: 9 / 82,
  mouthLeftOfBody: 38 / 92,
  mouthTopOfBody: 54 / 82,
};

interface TickleProps {
  /** Container size in pt (width == height). Below 34 only the bubble renders; the mouth drops below 40 (see design_handoff_tickle_draft2/README.md). */
  size: number;
  mood?: TickleMood;
  /** Idle "breathe" + mood-matched bubble loop. Off by default for small/inline uses. */
  animated?: boolean;
}

/**
 * The Tickle mascot: gradient body, two ink eyes, a half-round mouth, and a mood-colored bubble
 * overlapping its top-right corner. Motion (breathe/sink body, float/pulse/hop/drift bubble,
 * blink eyes) comes from `src/utils/motion.ts`, the shared 14-curve library ported from the
 * design file's motion section.
 */
export function Tickle({ size, mood = 'idle', animated = false }: TickleProps) {
  const breathe = useBreathe(animated && BODY_MOTION[mood] === 'breathe');
  const sink = useSink(animated && BODY_MOTION[mood] === 'sink');
  const bodyMotionStyle = BODY_MOTION[mood] === 'sink' ? sink : breathe;

  const float = useFloat(animated && BUBBLE_MOTION[mood] === 'float');
  const pulse = usePulse(animated && BUBBLE_MOTION[mood] === 'pulse');
  const hop = useHop(animated && BUBBLE_MOTION[mood] === 'hop');
  const drift = useDrift(animated && BUBBLE_MOTION[mood] === 'drift');
  const bubbleMotionStyle =
    BUBBLE_MOTION[mood] === 'pulse' ? pulse : BUBBLE_MOTION[mood] === 'hop' ? hop : BUBBLE_MOTION[mood] === 'drift' ? drift : float;

  const blink = useBlink(animated);

  const bubbleColor = BUBBLE_COLOR[mood];
  const bubbleSize = size * G.bubbleSize;

  if (size < 34) {
    return (
      <Animated.View
        style={[{ width: bubbleSize, height: bubbleSize, borderRadius: bubbleSize / 2, backgroundColor: bubbleColor }, bubbleMotionStyle]}
      />
    );
  }

  const bodyWidth = size * G.bodyWidth;
  const bodyHeight = size * G.bodyHeight;
  const eyeSize = size * G.eyeSize;
  const showMouth = size >= 40;

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[
          { position: 'absolute', left: size * G.bodyLeft, top: size * G.bodyTop, width: bodyWidth, height: bodyHeight },
          bodyMotionStyle,
        ]}>
        <LinearGradient
          colors={['#E3F0FE', '#B9D8FA']}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={{
            width: bodyWidth,
            height: bodyHeight,
            borderTopLeftRadius: size * G.bodyRadiusTop,
            borderTopRightRadius: size * G.bodyRadiusTop,
            borderBottomRightRadius: size * G.bodyRadiusBottom,
            borderBottomLeftRadius: size * G.bodyRadiusBottom,
          }}
        />
        <Animated.View
          style={[
            { position: 'absolute', left: size * G.eyeLeft1 - size * G.bodyLeft, top: size * G.eyeTop - size * G.bodyTop, width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: '#10203A' },
            blink,
          ]}
        />
        <Animated.View
          style={[
            { position: 'absolute', left: size * G.eyeLeft2 - size * G.bodyLeft, top: size * G.eyeTop - size * G.bodyTop, width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: '#10203A' },
            blink,
          ]}
        />
        {showMouth && (
          <View
            style={{
              position: 'absolute',
              left: bodyWidth * G.mouthLeftOfBody,
              top: bodyHeight * G.mouthTopOfBody,
              width: bodyWidth * G.mouthWidthOfBody,
              height: bodyHeight * G.mouthHeightOfBody,
              borderBottomLeftRadius: bodyHeight * G.mouthHeightOfBody,
              borderBottomRightRadius: bodyHeight * G.mouthHeightOfBody,
              backgroundColor: 'rgba(16,32,58,0.5)',
            }}
          />
        )}
      </Animated.View>

      <Animated.View
        style={[
          {
            position: 'absolute',
            left: size * G.bubbleLeft,
            top: size * G.bubbleTop,
            width: bubbleSize,
            height: bubbleSize,
            borderRadius: bubbleSize / 2,
            backgroundColor: bubbleColor,
            shadowColor: bubbleColor,
            shadowOpacity: 0.4,
            shadowRadius: bubbleSize / 2,
            shadowOffset: { width: 0, height: bubbleSize * 0.4 },
          },
          bubbleMotionStyle,
        ]}
      />
    </View>
  );
}
