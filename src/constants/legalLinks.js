/**
 * External links used across the app (legal pages, docs).
 *
 * Terms/Privacy are static HTML files served from this app's own
 * /public folder (public/terms-of-service.html, public/privacy-policy.html)
 * - Vite copies /public as-is into the build output, so these resolve at
 * the app's own root in every environment with no separate hosting step.
 * Every call site already opens these with target="_blank", so they open
 * in a new tab.
 *
 * === EDIT DOCS_URL TO YOUR REAL URL ===
 * Docs still isn't hosted anywhere yet - replace this placeholder once
 * it is.
 */
export const TERMS_URL = '/terms-of-service.html';
export const PRIVACY_URL = '/privacy-policy.html';
export const DOCS_URL = '/doc.html';

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
