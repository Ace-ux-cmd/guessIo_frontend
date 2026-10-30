# Template UI notes

The UI now follows the static template screens. Template styles live in `src/styles/template.css` (loaded after `ui.css` and `app.css`). Template class names are used directly in JSX.

## Dropped because the backend does not supply the data
- "Season 01" badge and per-player match counts or rating deltas on the leaderboard
- "+17 this week", "Season total" and "12 ranked" on the profile
- Total match count in the match history header and per-match round counts
- Matchmaking wait-time claim
- Per-round codes and turn counts on the match result screen (not in the match.ended payload)
- Per-guess timestamps on the gameplay board
- Settings toggles with no backend or client preference store: sound, haptics, countdown style, reduce motion, high contrast
- "Expected return" time on the maintenance screen, "Suspended on" date on the suspended screen

## Kept although the template has no equivalent
Guest "Play solo" and "Pass and play", Friends, Daily Challenge, Help, skills, privacy, blocked players, notification settings, opponent rating changes on results, appeal flow.

## Intentional deviations
- Bottom nav uses SVG icons instead of glyph characters.
- Forfeit, keypad and action buttons are at least 44px tall.
- Results screen for non-victory outcomes reuses the victory layout with a red, cyan or amber accent.
- Friends and Friend search have no template page; they are built from the rank, matches and settings parts.
- Login, Onboarding, Daily, Support and the shared sheets were not restyled.
