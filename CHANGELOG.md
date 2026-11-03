# Changelog

All notable changes to the guessIo frontend (web app) are documented in this file.

## 2.0.0

Needs backend 2.0.0 (migrations `006`, `007` and `008`). Each new system appears only when `GET /config/features` reports its flag on, and the app falls back to these defaults when the endpoint is unreachable: `friends`, `safety`, `daily`, `skills` and `push` on; `weeklyLeaderboard`, `forfeitSuspension` and `friendInvites` off.

### Friends and profiles
- Friends screen (`/friends`) with a Friends tab (`n/10`) and a Requests tab: accept, decline, cancel, remove with confirmation, and a Challenge button. The Profile screen links to it, with a count of new requests
- Add friends (`/friends/add`): search by exact username or call sign, minimum 2 characters, with Next and Previous page buttons. Each result shows Add, Requested, Accept, Friends or Unavailable. A closed inbox reads as Unavailable with no reason given
- Public player profile (`/players/:username`): rating, points, win rate, matches, record and unlocked achievements, read-only. A private profile shows "This profile is private" and an unknown or blocked player shows "Player not found". Back returns to where the player came from
- Player options sheet (view profile, add friend, block, report), opened by tapping a name on the leaderboard, the Home podium or the match results. A report from a result carries the match id, except for Custom matches
- Profile links from the leaderboard, podium and results use the real username (they used the call sign before, which gave "not found")

### Social safety
- Block with a plain explanation (any friendship ends, the player is not told, ranked matchmaking can still pair you), report with a reason and an optional note of up to 500 characters, and a blocked players list with Unblock in Settings
- Settings, Privacy: Private profile, Appear in search, and Anyone can send friend requests

### Daily Challenge
- Daily screen (`/daily`): time to beat (or "Set your time" for a first finish), the attempt flow with a timer counted from the server's start time and corrected for the gap between the device and server clocks, give up with confirmation, current and longest streak, a 30-day UTC calendar with a legend, and a countdown to the 00:00 UTC reset
- Entry points: a Daily button on Home and a Daily Challenge link on Profile that shows the streak
- Retry after a miss: when a finish does not beat the time to beat, a retry dialog opens with a challenging but friendly message, and the Daily page shows a Retry button. Retry asks for confirmation in a dialog that states the cost of 10 points, and is disabled when the player does not have enough points. If the player beats the time on a retry, that day turns from red to green in the 30-day streak calendar, and no further retry is offered
- Copy follows the rule that the time to beat is the best finish from the last `targetWindowDays` (7) days and resets after that long without a finish

### In-match skills
- Skill pick lobby: turn-based, with a countdown for the active picker and every pick visible to everyone. Disabled for everyone except the active picker, and the lobby closes on its own after the last pick
- Skill tab above the keypad with the states Use, on your turn, active, used and Extra Turn locked. Freeze and X-Ray Vision ask for a target when there is more than one opponent, with a 5 second picker that closes without spending the skill
- Reveal Position shows its pattern (for example `___5`) in a 5 second toast. X-Ray rows are drawn with dashed outlines and are mirrored from the server's `skill.xray`. The frozen player sees a "Frozen" notice (5 seconds, or tap to close), and the X-Ray target sees "You're being monitored" without a name
- A skill shows as active until its effect happens, is marked used only when the server sends `skill.consumed`, and returns to available with a message when the server sends `skill.returned`
- Custom rooms: a Skill power-ups toggle at creation, a Skills on or off chip in the room, and a skill step before the match where the host continues once all seats are filled and every player picks a skill
- How to Play has a skills step. New accounts see a floating welcome tip that points at the help button, and everyone sees a one-time "Introducing skills" pop-up

### Weekly leaderboard (`weeklyLeaderboard`)
- The rating board shows when the week resets and the time left, a locked rank card with "N more ranked matches to unlock your rank" for a player below the minimum (no rank is shown), and bots as normal entries
- The Home screen shows the weekly recap (top 3, and your own place when you finished lower) once per closed week, marked seen on the server. Podium entries open the read-only profile only when allowed
- While the week rolls over, the ranked option is disabled with a message and a blocking "Ranked is closed" dialog explains that Casual, Custom rooms and the Daily Challenge stay open. Ranked reopens when the server says so (`ranked.status`), with polling as a fallback (every 5 seconds while closed, otherwise every 15) and a fresh check at the moment you tap to search

### Friend challenge (`friendInvites`)
- Friends, Challenge opens a Custom room that invites that friend. The room shows the invite as sent with a countdown, declined, or expired (Invite again), or not sent with the reason (offline, in a match, invited a moment ago)
- A signed-in player sees a prompt for an invite on any screen except a match, a search or a room. Accept joins by code with the invite id and Decline tells the server. Only the latest invite shows, and it disappears when it is withdrawn or runs out

### Notifications
- Settings, Notifications: a device switch (web push, with a service worker at `/sw.js`) and three types: lost top 3 spot, friend activity, and daily streak at risk. Turning the device switch off turns the types off and locks them. The section appears only when `push` is on, and shows "This browser cannot receive notifications" in an unsupported browser. Needs `VAPID_*` configured on the backend

### New design
- All screens moved to the new template look: dark navy ground, new colour tokens, Space Grotesk for display and body text, and template styles in `src/styles/template.css` (see `TEMPLATE_UI_NOTES.md` for what was dropped, kept and changed on purpose)
- Refreshed logo across the in-app wordmark, splash, `logo.png`, app icons, Apple touch icon and favicons. The page title, manifest name and theme colours are updated
- Bottom bar: Home, Rank, Matches and Profile, with SVG icons
- Home: Code Legends podium of the top three, your rating, win rate and matches, a Last games list with See all and Play now, the Daily entry and the help button
- Leaderboard: rating only (the Points leaderboard and the Ratings and Points switch are removed), the top 3 on a podium, ranks to 20 and your own rank below the list
- Results: your rating shown as old to new in the colour of the change, the same for opponents in Ranked, and Play again (Try again after a loss), Match details and Back home
- Custom replaces "Private" in match labels and on the Play screen. Play and Matchmaking have updated copy (Find opponents, Create a room, Cancel search)
- Shared sheets and pop-ups fade and slide in and out, can be centred, take an accent, make the rest of the page inert and return focus on close. The splash is a new boot screen, and the login, error, Help and guest screens are restyled
- Guess rows show larger player avatars

### Changed
- Round end: the last round of a match no longer shows a "next round" countdown (it reads "Match results in Ns") and then opens the match results. A forfeit or cancellation goes straight to the results
- A rating never shows below 0: a player on 0 who loses reads 0 to 0, and your own line shows the change that really applied
- The match screen and matchmaking replace the current history entry when a match is found, so Back from the results cannot return to matchmaking or a room and queue again
- Reconnect also restores a match that is in the `FOUND` state
- Screens are lazy-loaded with one skeleton placeholder, the screens most sessions reach next are preloaded when the browser is idle, and the libraries are split into cached chunks (`react`, `data`, `socket`)
- Dead code removed, including the unused `useUpdateProfile`, `useMatchDetails`, `getConfigForPlayerCount`, `outcomeInfo`, `MATCH_TYPES`, `DIFFICULTIES` and `POINTS_TABLE`
- README updated (Custom rooms, v2.0.0 features and routes, tests, font), and the copyright holder name in `LICENSE` and the README changed

### Fixes
- A guess is sent once: the keypad ignores a second send until the server answers, and unlocks itself after 5 seconds if no answer comes
- Double taps on Forfeit send one forfeit
- Events from a previous match are ignored after the store is reset, except a snapshot, so a late result cannot overwrite the next match
- Matchmaking only leaves the queue when it actually joined and no match was found (it used a stale value before)
- An Extra Turn restarts the turn countdown for the second guess in a row
- The "already used" digit warning clears its previous timer, so it no longer flickers on rapid taps
- The countdown hook is derived on every render, so a new target reads correctly on its first render

### Version stamp
- The bundle version (`package.json`, or `VITE_APP_VERSION` in CI) is built in as `__APP_VERSION__` and sent as `X-Client-Version` on requests and as `clientVersion` on the socket handshake, so the backend can tell which bundle a client runs

### Tests
- A Vitest and Testing Library suite (`npm test`) with 12 test files covering screens, gameplay, skills and skill consumption, Custom room skills, the round-to-results flow, match navigation, player options, friend invites, the weekly leaderboard, results and profile

## V1.0 - Initial Release

### Sign-in and onboarding
- Login screen with "Continue with Google", a Terms and Privacy consent checkbox, and "Play as guest"
- Animated demo board on the login screen
- Google callback screen
- "Choose a username" onboarding for new accounts: lowercase conversion, live availability check, cancel confirmation, retry if the name is taken
- Rate-limit message when sign-in is attempted too often
- Account Locked screens for suspended and banned accounts, with an appeal form for suspended accounts and "This decision is final" for banned ones

### Home and navigation
- Splash screen
- Four-tab bottom bar: Home, Leaderboard, Matches, Profile
- Dashboard: Play button, last game, 3 most recent matches, rating, win rate, matches played, How to Play
- Guest home: "Play solo", sign-in pitch, locked tiles (Multiplayer, Leaderboards, History, Private Rooms) that lead to sign-in
- How to Play: 4-step walkthrough with an animated worked example

### Playing
- New match screen: Ranked, Casual or Private, with 2, 3 or 4 players and Standard or Hardcore rules
- Matchmaking screen with seat-by-seat roster (names and avatars), elapsed timer and bots shown as they join
- Private rooms: create, join with a code, tile-style room code with Copy button, host badge, read-only settings chips, host-only start
- Gameplay screen: guess board, guess input, scoreboard, turn panel and countdown ring (amber at 10 seconds, red at 5 on your own turn)
- Private feedback colors: green, yellow and gray in Standard, merged in Hardcore
- Round Result screen with revealed code, running score, round time and fastest guess
- Results screen with outcome, rounds won, rating and points earned, and a "Match details" link (not shown for Private matches)
- Forfeit flag button with confirmation; Escape and the Back button open the same prompt
- Logout warning when a match is in progress

### Connection handling
- "Connection lost" banner with a Reconnect button
- Automatic reconnect (3 tries), then a "Could not reconnect" dialog with Reconnect or Play as guest
- Full match restore after refresh or network loss
- Browser "are you sure" prompt when refreshing or closing the tab during a live match
- Session termination guard when the account is signed in on another device

### Guest and Practice mode
- Vs computer and Pass and play, no account needed
- Round Length: Easy (4 digits, 10 guesses), Medium (5 digits, 12), Hard (6 digits, 15)
- Local rules engine mirroring the server (code generator, evaluator, validator, bot)
- Unfinished guest matches are kept on the device and offered as "Resume match?"
- Warnings that guest progress is not saved

### Profile, achievements and settings
- Profile: call sign with @username, rating, points, win/draw/loss bar, Competitive status card with live Top 10 banner, top achievements
- Achievements screen: progress bar, Unlocked and Locked lists
- "Achievement unlocked" prompt (Ok or Go to achievements), deferred during matchmaking, rooms and gameplay
- Edit profile sheet: call sign, Save changes disabled until something changes
- Settings: Edit profile, Help and feedback, Documentation, Terms of service, Privacy policy, Log out, Delete account
- Delete account confirmed by typing your own email

### History and leaderboards
- Matches tab: filters All, Ranked, Casual, Wins, Losses; grouped by date; 20 per page with Load more
- Outcomes shown: Win, Loss, Forfeit, Draw, Cancelled
- Match details: round-by-round breakdown with every secret code, participants, rating change, points, total guesses and match time
- Leaderboards: Rating and Points toggle, top-3 podium and ranks 4 to 20, "Your position" card, shown by call sign
- Note and report link on Results when a win earns no rating because every opponent left

### Help and feedback
- Discord, WhatsApp announcements channel, feedback survey card (shows "Survey closed" when `VITE_SUPPORT_GOOGLE_FORM_URL` is unset), and a "Contact me" email link
- Open to guests

### Error screens
- No connection, Server error, Room not found, Page not found, Maintenance, Unauthorized (signed out), Suspended, Banned
- Route-level error boundary

### Design and static pages
- Dark "hacker terminal" look, neon green accent, Orbitron and Barlow fonts, bot avatars
- Terms, Privacy Policy and game guide links (hosted on guessio.online)
- PWA manifest (name, icons, black theme)

### Tech
- React 18, Vite, react-router, zustand, react-query, socket.io-client, axios
- Environment variables: `VITE_API_BASE_URL`, `VITE_WS_URL`, `VITE_SUPPORT_GOOGLE_FORM_URL`

## Unreleased
- Guest home opens on the leaderboard sign-in block; solo and pass and play setup stays under "Play as guest".
- Guest final round goes straight from the round result to the match results with no flash of the game board.
- Daily challenge rebuilt on the shared app shell, stat tiles, guess board and keypad.
- Other player profile uses the same rank pill as My Profile; the friend button is small and sits beside the name.
- Achievement icons are centred in their badges on every profile (selector scoping fix).
- App type scale raised by 10%.
- Guess rows show player avatars instead of initials.
