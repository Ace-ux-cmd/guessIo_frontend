import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: { username: 'ace', createdAt: '2026-03-01T00:00:00Z', friends: { incomingRequests: 2 }, dailyStreak: { current: 1, longest: 3 } }, isLoading: false }),
  useAchievements: () => ({ data: { achievements: [] }, isLoading: false }),
  useLogout: () => ({ mutate: vi.fn() }),
  useDeleteAccount: () => ({ mutate: vi.fn() }),
}));
vi.mock('../src/hooks/useFeatures', () => ({ useFeatures: () => ({ friends: true, daily: true }) }));
vi.mock('../src/api/profile.api', () => ({ getPublicProfile: () => Promise.resolve({ username: 'ace', displayName: 'Ace the Great', stats: {} }) }));

import Profile from '../src/screens/profile/Profile';

afterEach(cleanup);

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><Profile /></MemoryRouter></QueryClientProvider>);
}

describe('profile header', () => {
  it('shows the name with an edit button, and a friends link carrying the request count', async () => {
    mount();
    const heading = await screen.findByRole('heading', { name: 'Ace the Great' });
    const pencil = screen.getByRole('button', { name: 'Edit profile' });
    expect(heading.parentElement.contains(pencil)).toBe(true);
    const friends = await screen.findByRole('link', { name: /Friends, 2 new requests/ });
    expect(friends.getAttribute('href')).toBe('/friends');
    expect(friends.closest('header')).toBe(heading.closest('header'));
  });

  it('shows the username and joined date on one handle line under the name', async () => {
    mount();
    const heading = await screen.findByRole('heading', { name: 'Ace the Great' });
    const handle = screen.getByText(/@ace/);
    expect(handle.textContent).toMatch(/Joined Mar 2026/);
    expect(heading.compareDocumentPosition(handle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('profile account links', () => {
  const position = (a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;

  it('lists settings, daily challenge and help above sign out, with the right targets', async () => {
    mount();
    const settings = await screen.findByRole('link', { name: /Settings/ });
    const daily = screen.getByRole('link', { name: /Daily Challenge/ });
    const help = screen.getByRole('link', { name: /Help/ });
    const signOut = screen.getByRole('button', { name: /Sign out/ });
    expect(settings.getAttribute('href')).toBe('/settings');
    expect(daily.getAttribute('href')).toBe('/daily');
    expect(help.getAttribute('href')).toBe('/support');
    expect(position(settings, daily)).toBeTruthy();
    expect(position(help, signOut)).toBeTruthy();
  });
});
