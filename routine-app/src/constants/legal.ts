import { lang } from '@/i18n';

/** Public pages (docs/), hosted on Vercel. GitHub Pages still mirrors them as a fallback. */
export const SITE = 'https://tickle-app.vercel.app';

export const PRIVACY_URL = `${SITE}/privacy.html`;

/** Terms page has EN + TH; open it in the app's current language. */
export function termsUrl() {
  return `${SITE}/terms.html?lang=${lang()}`;
}
