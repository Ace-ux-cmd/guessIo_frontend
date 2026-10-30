import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';
import PlayerSheet from '../src/components/social/PlayerSheet';

afterEach(cleanup);

function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname}</p>; }

describe('player sheet', () => {
  it('opens the profile by the real username, not the call sign shown on the leaderboard', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/leaderboards']}>
          <Routes><Route path="*" element={<><PlayerSheet player={{ username: 'Bobby B', handle: 'bob0xpo2' }} onClose={() => {}} /><Where /></>} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    act(() => screen.getByRole('button', { name: 'View profile' }).click());
    expect(screen.getByTestId('where').textContent).toBe('/players/bob0xpo2');
  });
});
