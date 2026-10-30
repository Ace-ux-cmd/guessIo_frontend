/** The web bundle version this build was made from (package.json, or VITE_APP_VERSION in CI). */
// eslint-disable-next-line no-undef
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

export function compareVersions(a, b) {
  const parse = (v) => (/^(\d+)\.(\d+)\.(\d+)/.exec(String(v ?? '')) || [0, 0, 0, 0]).slice(1).map(Number);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}
