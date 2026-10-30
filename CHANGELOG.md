# Changelog

All notable changes to the guessIo frontend (web app) are documented in this file.

## V2.0.0

Needs backend V2.0.0 (migration `006_social_daily_skills_push.sql`). Every new system hides itself if the backend reports its feature flag off (`GET /config/features`).

### Design update (v3.9)
- Every screen except Home runs on a 13.5px root with compact buttons, keys, chips and avatars; Home keeps the full 16px size
- Home: smaller logo and header controls, a faded Code Legends podium, and a Play button beside "Your last games" (the "Crack the code" card is gone)
- New logo everywhere: in-app logo, splash, app icons, Apple touch icon and favicons
- Profile: the edit pencil sits beside the name, with the username and join date under it; Leaderboard comes before Daily Challenge; Settings and Help sit side by side above Log out; Friends stays beside the name
- Results: opponents' ratings read old to new in the colour of their change; Play and Home share one line with Match details below

### Fixes
- A rating never shows below 0: a player on 0 who loses reads 0 to 0 in plain colour, and your own line shows the change that really applied
- Round win to results: the last round's result stays up for 3 seconds with "Match results in 3s" (no "next round" countdown for a round that decides the match), then the match results open. The live board is no longer painted for a frame in between, and a forfeit or cancellation goes straight to the results. Back skips the pause
- Daily Challenge copy follows the new rule: the time to beat is your best finish from the last 7 days and resets after a week without one
- Back, Forward, a refresh or a bookmark can no longer put a player in the matchmaking queue; only tapping Find match does. A found match replaces the matchmaking screen in history
- Matchmaking only leaves the queue when it actually joined and no match was found (it used a stale value before)
- Events from a previous match are ignored after the store is reset, so a late result cannot overwrite the next match
- A guess is sent once: the keypad ignores a second send until the server answers, and unlocks itself after 5 seconds if no answer comes
- Double taps on Forfeit and on the results buttons act once; the results page no longer flashes "Match cancelled" while leaving
- The skill lobby is included in the periodic resync, so a missed event cannot leave it stuck
- The "already used" digit warning no longer flickers on rapid taps
- X-Ray Vision: the target sees "You're being monitored" (needs backend `skill.monitored`); it never says who

### New design (v3.8)
- Every screen moved to the v3.8 look: black ground, chunky offset-shadow cards, Kanit and Figtree type, one accent per card
- Four-tab bottom bar (Home, Ranks, Matches, You)
- New home with the Code Legends podium, the Daily entry and your last games
- Leaderboard with a podium; tapping a name opens that player's options
- Guest home, guest setup ("Set up the game", with the practice note above "Your name"), pass and play, how to play, help, round result, match results and match details restyled
- Gameplay: avatar rows, 3-column keypad, countdown circle, forfeit and help in the header. A skipped turn adds nothing to the board
- Number tiles no longer carry a dot in the top right corner
- Error pages as big coloured words (Offline, 500, 404, Paused, Signed out, Suspended, Banned)
- Matches list has no Private filter; the friends option is called Custom

### Friends and profiles
- Friends list and requests, Add friends search (exact username or call sign), public player profiles (read-only stats and achievements, add or accept, block, report)
- Friend challenge opens the Custom room flow

### Social safety
- Block with a plain explanation, report with reason and note, blocked players list with Unblock
- Settings: private profile (hides you from search, closes your profile, stops requests), appear in search, who can send requests

### Daily Challenge
- Daily screen: time to beat, attempt flow with a server-owned timer, streak, 30-day calendar, reset countdown

### In-match skills
- Skill pick lobby (3 seconds per pick, everyone sees every pick), skill tab above the keypad, target picker with a 5 second timer for Freeze and X-Ray
- Skills can only be used on your own turn. Reveal Position shows a pattern such as `___5` in a 5 second toast. X-Ray rows are drawn with dashed outlines

### Notifications
- Settings: notifications on this device, lost top 3 spot, friend activity, daily streak at risk (web push; needs `VAPID_*` on the backend)

### Version stamp
- The bundle version is sent as `X-Client-Version` and on the socket handshake, so the backend knows whether a client understands skills. Over-the-air updating itself belongs to the mobile app, not this repository

### After first testing
- A new guess flips tile by tile from grey, so no colour shows before the flip; only your own row animates and the turn passes on straight away
- Forfeit is a red door; the "?" is gone from the match screen
- Screens that need several requests show one placeholder and appear complete; routes are split and preloaded
- Profile links from the leaderboard, podium and results use the real username (they used the call sign, which gave "not found"); back goes where you came from
- Reveal Position toast fixed (it was drawn outside the screen); skill picks are 10 seconds and the last pick waits out its window; Freeze tells the frozen player for 5 seconds
- Home: coloured last 3 games with See all, a welcome ribbon for new accounts, a one-time skills introduction; How to play lists the skills
- Profile: help and friends icons (with a request count) and settings at the top, log out at the bottom
- Settings: turning notifications off on the device switches the alert types off and locks them
- Leaderboard: top 20 plus your own rank at the bottom, always
- Removed dead code and unused exports; main script 511 kB to 77 kB (libraries split into cached chunks)

### Second round of changes
- The skills introduction is now a pop-up overlay, and the welcome message for a new account is a small blue banner floating over the screen (no layout shift) that points at the help button. Every sheet and pop-up fades and slides in and out
- Release survey pop-up after 5 finished games, once per account (web and mobile share the state through the backend)
- The player menu shows Friends, Sent, Accept, Add friend or Unavailable, matching the relationship

### Other
- Results shows rating before and after (ranked) and the opponents' ratings
- Frontend test suite (`npm test`)

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
