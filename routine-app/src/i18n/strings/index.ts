import account from './account';
import common from './common';
import home from './home';
import onboarding from './onboarding';
import icons from './icons';
import plan from './plan';
import premium from './premium';
import profile from './profile';
import progress from './progress';
import type { Entry } from './types';

export const STRINGS = {
  ...common,
  ...account,
  ...home,
  ...onboarding,
  ...icons,
  ...plan,
  ...progress,
  ...premium,
  ...profile,
};

export type StringKey = keyof typeof STRINGS;
export type { Entry };
