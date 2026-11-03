import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let features = { push: true };
vi.mock('../src/hooks/useFeatures', () => ({ useFeatures: () => features }));

let push = { supported: true, permission: 'default', subscribed: false, turnedOff: false };
vi.mock('../src/lib/push', () => ({ getPushState: async () => ({ ...push }) }));

import NotificationPrompt, { SNOOZE_MS, isSnoozed } from '../src/components/ui/NotificationPrompt';

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 50)); });

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.hash}</p>;
}
function mount(props = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes><Route path="*" element={<><NotificationPrompt userId="u1" {...props} /><Where /></>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  features = { push: true };
  push = { supported: true, permission: 'default', subscribed: false, turnedOff: false };
});
afterEach(cleanup);

describe('NotificationPrompt', () => {
  it('asks to turn notifications on and opens the notifications section of Settings', async () => {
    mount();
    expect(await screen.findByRole('dialog', { name: 'Turn on notifications' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/settings#notifications'));
    expect(isSnoozed('u1')).toBe(true);
  });

  it('also asks when permission is already granted but this device is not subscribed (older Android)', async () => {
    push.permission = 'granted';
    mount();
    expect(await screen.findByRole('dialog', { name: 'Turn on notifications' })).toBeTruthy();
  });

  it('"Not now" closes it and keeps it away for a week', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(screen.getByTestId('where').textContent).toBe('/dashboard');
    expect(isSnoozed('u1')).toBe(true);
    expect(isSnoozed('u1', Date.now() + SNOOZE_MS + 1000)).toBe(false);
    cleanup();
    mount();
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each([
    ['this device cannot receive them', () => { push.supported = false; }],
    ['the player switched them off on purpose', () => { push.turnedOff = true; }],
    ['the system blocked them', () => { push.permission = 'denied'; }],
    ['the device is already subscribed', () => { push.subscribed = true; }],
    ['the server has push switched off', () => { features = { push: false }; }],
  ])('stays hidden when %s', async (_name, arrange) => {
    arrange();
    mount();
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('waits while another pop-up is open', async () => {
    mount({ canShow: false });
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
