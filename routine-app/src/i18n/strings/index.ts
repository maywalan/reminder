import account from './account';
import common from './common';
import home from './home';
import plan from './plan';
import premium from './premium';
import profile from './profile';
import progress from './progress';
import type { Entry } from './types';

export const STRINGS = {
  ...common,
  ...account,
  ...home,
  ...plan,
  ...progress,
  ...premium,
  ...profile,
};

export type StringKey = keyof typeof STRINGS;
export type { Entry };
