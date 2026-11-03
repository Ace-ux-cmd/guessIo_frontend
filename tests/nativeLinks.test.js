import { describe, expect, it } from 'vitest';
import { routeFromDeepLink } from '../src/lib/native';
import { compareVersions } from '../src/lib/version';

describe('routeFromDeepLink', () => {
  it('maps the Google callback with its code', () => {
    expect(routeFromDeepLink('io.guessio.app://auth/google/callback?code=abc')).toEqual({ pathname: '/auth/google/callback', search: '?code=abc', hash: '' });
  });
  it('keeps the appeal fragment on suspended accounts', () => {
    expect(routeFromDeepLink('io.guessio.app://error/suspended#appeal=tok')).toEqual({ pathname: '/error/suspended', search: '', hash: '#appeal=tok' });
  });
  it('allows the login failure redirect', () => {
    expect(routeFromDeepLink('io.guessio.app://login?google=failed')?.pathname).toBe('/login');
  });
  it('refuses other schemes and other paths', () => {
    expect(routeFromDeepLink('https://evil.example/login')).toBeNull();
    expect(routeFromDeepLink('io.guessio.app://settings')).toBeNull();
    expect(routeFromDeepLink('io.guessio.app://auth/google/callback/../../admin')).toBeNull();
  });
});

describe('bundle version order', () => {
  it('treats a higher patch as newer', () => {
    expect(compareVersions('2.0.3', '2.0.12')).toBe(-1);
  });
});
