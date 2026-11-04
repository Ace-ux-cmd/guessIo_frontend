/**
 * External links used across the app. The static pages (Terms, Privacy,
 * game guide, mobile download) are hosted on the main site, not in this
 * app's /public folder. Every call site opens them with target="_blank".
 */
const SITE_URL = 'https://guessio.online';

export const TERMS_URL = `${SITE_URL}/terms-of-service`;
export const PRIVACY_URL = `${SITE_URL}/privacy-policy`;
export const DOCS_URL = `${SITE_URL}/doc`;
export const DOWNLOAD_URL = `${SITE_URL}/download`;

/**
 * Appeals fallback contact for a suspended/banned account reached via the
 * Google login-time redirect (no session ever existed, so the in-app
 * appeal form in AccountLocked.jsx has no token to authenticate with - see
 * requireSuspendedOrBanned on the backend). Used both as the visible
 * address and as the destination Gmail compose is pointed at below.
 */
export const SUPPORT_EMAIL = 'elvismbonu100@gmail.com';

/**
 * Builds a Gmail compose URL (opens Gmail's web compose view directly,
 * pre-addressed/pre-filled) for the no-token appeal fallback. The body is
 * a fill-in-the-blank template rather than pre-populated data, since this
 * path by definition has no username/email on hand to fill in - there was
 * never an authenticated session for this suspension (see the file-level
 * note on AccountLocked.jsx). `variant` is 'suspended' or 'banned', used
 * only to phrase the subject/body appropriately.
 */
export function buildAppealGmailUrl({ variant }) {
  const subject = `guessIo Account Appeal - ${variant === 'banned' ? 'Ban' : 'Suspension'}`;
  const body = [
    'Username:',
    'Email address on account:',
    'Product: guessIo',
    '',
    'Reason for appeal:',
    '',
  ].join('\n');
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: SUPPORT_EMAIL,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
