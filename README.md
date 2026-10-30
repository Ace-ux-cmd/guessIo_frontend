# guessIo Frontend (Web)

The web client for **guessIo**, a multiplayer code-breaking game by Ace Realm. Everyone at the table races to crack the same secret code. Analyse, outsmart, crack the code.

This app talks to the guessIo backend over HTTP and Socket.IO. It also includes a full offline guest mode (Practice) that runs entirely in the browser.

## Tech stack

- React 18 and Vite 5
- react-router-dom 7
- zustand for state, TanStack React Query for server data
- axios for HTTP, socket.io-client for real-time play
- Tailwind v3 used only as a build-time tool. The app loads plain generated CSS and has no Tailwind runtime

## Getting started

### Requirements
- Node.js 18 or newer
- A running guessIo backend (see the backend README)

### Setup

```bash
npm install
cp .env.example .env     # then adjust the values
npm run dev              # http://localhost:5173
```

## Scripts

`npm test` runs the Vitest suite (screens render, skills, version helpers).


| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build locally |

## Environment variables

Vite bakes `VITE_*` values into the bundle at build time. Set the real production values in the build environment (or an uncommitted `.env.production`), never a dev tunnel URL.

| Variable | Notes |
|---|---|
| `VITE_API_BASE_URL` | Backend HTTP base URL, for example `http://localhost:4000` |
| `VITE_WS_URL` | Backend Socket.IO URL, for example `http://localhost:4000` |
| `VITE_SUPPORT_GOOGLE_FORM_URL` | Feedback form link for the Help and feedback page. When unset the card shows "Survey closed" |

The backend's `CLIENT_ORIGIN` must include the origin this app is served from.

## Features

- Google sign-in with a one-time mandatory username step
- Matchmaking for Ranked and Casual, Custom rooms with a room code, 2 to 4 players, Standard and Hardcore rules
- Live gameplay with turn timer, private feedback colors, round results and match results
- Reconnect handling: banner, automatic retries, "Could not reconnect" dialog, full match restore
- Guest and Practice mode (vs computer or pass and play) with local resume
- Profile, achievements with unlock prompts, match history and details, leaderboards (top 20)
- Settings, Help and feedback, account locked screens with appeals, error screens
- v2.0.0: friends and search, public profiles, block and report, privacy settings, Daily Challenge, in-match skills, push notification settings
- Static pages: game guide, Privacy Policy, Terms of Service

## Routes

| Path | Screen |
|---|---|
| `/login`, `/onboarding`, `/auth/google/callback` | Sign-in flow |
| `/dashboard`, `/guest-home` | Home (signed in or guest) |
| `/play`, `/matchmaking`, `/private-room` | Starting a match |
| `/gameplay`, `/gameplay/guest` | Live match, guest match |
| `/results`, `/results/guest` | Match results |
| `/profile`, `/profile/achievements` | Profile and achievements |
| `/history`, `/history/:id` | Match history and details |
| `/leaderboards` | Leaderboards |
| `/settings`, `/support` | Settings, Help and feedback |
| `/friends`, `/friends/add`, `/players/:username` | Friends, search, public profile |
| `/daily` | Daily Challenge |
| `/error/offline`, `/error/server`, `/error/room-not-found`, `/error/maintenance`, `/error/unauthorized`, `/error/suspended`, `/error/banned` | Error screens |

Signed-in routes are protected by `RequireAuth`. Unknown paths show the Page not found screen.

## Project structure

```
src/
  api/          Axios client and API modules
  components/   UI, gameplay, achievements and profile components
  constants/    Game config, legal and support links
  game/         Offline guest engine (code generator, validator, evaluator, bot, storage)
  hooks/        Auth, socket, reconnect, back button, unload warning and more
  lib/          Formatting helpers
  screens/      One folder per area (auth, dashboard, play, gameplay, results, history, ...)
  sockets/      Socket.IO client
  stores/       zustand stores (auth, match, achievement notifications)
  styles/       app.css (hand-written) and ui.css (generated)
public/         Icons, manifest, bot avatars
tools/          CSS generation setup
```

## Styling

`src/styles/ui.css` is generated plain CSS (Tailwind v3 output). Regenerate it after adding new utility classes to JSX:

```bash
bash tools/build-css.sh
```

Class names must appear as complete literal strings in JSX (no `"w-" + n`), or the generator cannot see them. Hand-written styles live in `src/styles/app.css`. See `tools/README.md` for details.

## Notes

- Fonts: Orbitron (display) and Barlow (body)
- Support email and external links are set in `src/constants/legalLinks.js`
- Terms, Privacy Policy, the game guide and the mobile download page are hosted on `https://guessio.online` and linked from `src/constants/legalLinks.js`
- There is no frontend test suite yet

## License

MIT, Copyright (c) 2026 Ace Realm. See `LICENSE`.
