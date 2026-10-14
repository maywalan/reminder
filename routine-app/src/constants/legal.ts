import { lang } from '@/i18n';

const SITE = 'https://maywalan.github.io/reminder';

export const PRIVACY_URL = `${SITE}/privacy.html`;

/** Terms page has EN + TH; open it in the app's current language. */
export function termsUrl() {
  return `${SITE}/terms.html?lang=${lang()}`;
}
