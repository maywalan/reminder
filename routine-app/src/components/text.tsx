import { createContext, forwardRef, useContext } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { Fonts } from '@/constants/theme';

/**
 * App-wide `Text` / `TextInput` that always render in the design system's Anuphan face. Import
 * these instead of react-native's (every screen does). A custom font needs its weight's own file
 * as `fontFamily` (see `Fonts` in constants/theme.ts) — with only `fontWeight` set, iOS silently
 * falls back to the system font — so this fills in the matching Anuphan file from the style's
 * `fontWeight` whenever a style doesn't name a `fontFamily` itself.
 *
 * A nested `<Text>` with no weight of its own leaves `fontFamily` alone, so it keeps inheriting
 * its parent's (e.g. a bold run inside a sentence stays bold).
 */

const InsideText = createContext(false);

function familyFor(weight: TextStyle['fontWeight']): string {
  switch (String(weight ?? '400')) {
    case '500':
      return Fonts[500];
    case '600':
      return Fonts[600];
    case '700':
    case '800':
    case '900':
    case 'bold':
      return Fonts[700];
    default:
      return Fonts[400];
  }
}

function withFont(style: StyleProp<TextStyle>, nested: boolean): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return style;
  if (nested && flat.fontWeight === undefined) return style;
  return [style, { fontFamily: familyFor(flat.fontWeight) }];
}

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  const nested = useContext(InsideText);
  const text = <RNText ref={ref} {...rest} style={withFont(style, nested)} />;
  return nested ? text : <InsideText.Provider value={true}>{text}</InsideText.Provider>;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} style={withFont(style, false)} />;
});
