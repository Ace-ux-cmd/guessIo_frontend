# Changelog

All notable changes to the guessIo frontend (web app) are documented in this file.

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
- Game guide (`doc.html`), Privacy Policy and Terms of Service pages
- PWA manifest (name, icons, black theme)

### Tech
- React 18, Vite, react-router, zustand, react-query, socket.io-client, axios
- Environment variables: `VITE_API_BASE_URL`, `VITE_WS_URL`, `VITE_SUPPORT_GOOGLE_FORM_URL`
