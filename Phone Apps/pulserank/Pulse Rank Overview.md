# Pulse Rank Daily Quiz — MVP Spec (Expo iOS)

## Overview

Pulse Rank is a tiered, competitive medical knowledge training app that delivers daily micro-learning with strong retention hooks. Users create an account with **email login** but choose a **public username** for anonymity (shown on leaderboards, badges, and social profile). Users select a Knowledge Level (Layperson, EMT, Nurse/MA, Pharmacist, Physician/PA) and optionally choose **focus topics** they want to practice and **topics to avoid**. Every day at a scheduled release time (**12:00 PM Eastern**), users receive **five multiple-choice questions** tailored to their level and preferences. After each answer, the app shows a **prewritten explanation** for the correct answer and (optionally) a short "why this is wrong" note for the chosen incorrect option — no LLM required for feedback.

A second daily engagement event runs at **8:00 PM Eastern**: a **Live Poll Question** open for **2 hours**. Users answer once, then see a live distribution (right vs. wrong). If they haven't participated, they can receive a nudge notification (e.g., "58% missed this — can you get it?"). Users earn **badges** (highly colorful, collectible) and appear on **tier-based leaderboards**. Badges are displayed in a grid: locked badges are **grayed out**, earned badges are **full color**, and duplicates show a small **counter badge** in the bottom-right corner (e.g., "x3"). A social layer allows users to connect with others and view each other's profiles and achievements, encouraging friendly competition and viral sharing.

---

## Knowledge Levels

Users select one Knowledge Level during onboarding. This determines which question pool they draw from and which leaderboard they compete on.

### 1. Layperson / Beginner
Tailored to individuals with little to no formal medical background. Perfect for those curious about health basics or just starting to explore medical topics.

### 2. EMT (Emergency Medical Technician)
Designed for pre-hospital providers. Questions focus on emergency care, trauma, and rapid assessment — ideal for EMTs or those training for that role.

### 3. Nurse / Medical Assistant (MA)
Suited for nursing students, practicing nurses, or medical assistants. Covers clinical care, patient interaction, and common medical scenarios.

### 4. Pharmacist
Targeted at pharmacy students or practicing pharmacists. Questions focus on medications, interactions, and therapeutic principles.

### 5. Physician / PA (Physician Assistant)
Aimed at medical students, PAs, or physicians. Challenges focus on diagnostics, complex cases, and clinical decision-making.

---

## Core Functions

### 1. Onboarding & Login

- User signs up with email (username set for anonymity).
- Select Knowledge Level (Layperson, EMT, Nurse/MA, Pharmacist, Physician/PA).
- Set focus/avoid topics (optional).
- Tutorial highlights daily quiz and poll schedule.

**Authentication / Identity:**
- **Login required:** Email + password (or email magic link if preferred)
- **Public identity:** User must create a **unique username**
  - Username is what others see (leaderboard, profile, shares)
  - Email is never shown publicly

**Profile Preferences:**
- Select Knowledge Level
- Select focus topics (include)
- Select avoid topics (exclude)
- Notification preferences (daily quiz, poll, reminders)

#### Acceptance Criteria (MVP)
- Email login + username creation
- Editable Knowledge Level + topic preferences
- Add friend/follow + view profile achievements

---

### 2. Daily Quiz Flow (Primary Daily Session)

- **Daily release time:** **12:00 PM Eastern** (gives morning/lunch/afternoon window)
- At noon: unlock 5 tailored questions.
- User answers each question (immediate explanation shown after each answer).
- Daily quiz completion tracked (streaks, accuracy).

**Content:** 5 multiple-choice questions/day

**Tailoring:**
- Knowledge **Level**
- Focus topics (include)
- Avoid topics (exclude)

**Feedback after each question (no LLM required):**
- Correct answer explanation
- Optional per-wrong-choice note (prewritten), OR a generic "why not" explanation keyed to that distractor

#### Acceptance Criteria (MVP)
- Users see exactly **5 new questions** each day after the release time
- No repeats until pool is exhausted (per level + topic filter)
- Answer state saved and resume supported

---

### 3. Live Poll Flow (Secondary Daily Session)

- **Schedule:** Daily at **8:00 PM Eastern**
- **Window:** Open for **2 hours**
- At 8 PM: one poll question available (2-hour window).
- User answers and views real-time correct/incorrect stats.
- Participation tracked (poll streaks).

**Experience:**
- One question
- Live stats: % correct vs % incorrect
- Optional "trending answer" chart (simple bar)

**Notifications:**
- Poll opens ("Tonight's Live Question is up!")
- Reminder near closing ("Poll closes soon")
- Optional mid-window nudge w/ stats ("58% got it wrong...")

#### Acceptance Criteria (MVP)
- Poll opens/closes reliably by time window
- Users can answer once; results update in real time

---

### 4. Leaderboard & Social

**Leaderboard:**
- **Separate leaderboards per Knowledge Level** (fair competition)
- Rank by accuracy, streaks, participation
- Rankings based on:
  - Daily quiz accuracy (rolling 7/30 days)
  - Poll participation + correctness
  - Streak multipliers (optional later)
- Display: Username (anonymous), Level badge/icon, Score + rank movement (optional)

**Social Layer:**
- Connect with users (friend/follow)
- Connect/follow system:
  - Search by username
  - Send/accept request OR simple follow
- View others' profiles: badges, streaks, optional stats
- Basic stats (streaks, accuracy) — optional privacy toggle

#### Acceptance Criteria (MVP)
- Level-based leaderboard visible
- User appears with current rank and score
- Add friend/follow + view profile achievements

---

### 5. Badges & Achievements (Highly Visual + Shareable)

- Badge screen shows all possible badges (grayed out if locked).
- Earned badges in full color; duplicates show count icon (e.g., "x2").
- Share badges via social media.

**Badge Grid UI Rules:**
- Show all possible badges
- Locked = **grayscale**
- Earned = **full color**
- If badge can be earned multiple times, show a small counter bottom-right (e.g., "x2")

#### Badge Set (Initial)

**Accuracy Streak Badges (Daily Quiz):**

| # | Badge | Trigger |
|---|-------|---------|
| 1 | **Pinpoint x5** — 5 correct in a row | Any continuous streak of 5 correct across daily questions |
| 2 | **Clinical Flow x10** — 10 correct in a row | Any continuous streak of 10 correct |
| 3 | **Attending Mode x20** — 20 correct in a row | Any continuous streak of 20 correct |

**Live Poll Participation Badges:**

| # | Badge | Trigger |
|---|-------|---------|
| 4 | **Poll Regular (3-Day)** | Participate in the poll 3 days in a row |
| 5 | **Poll Committed (10-Day)** | Participate 10 days in a row |
| 6 | **Poll Veteran (20-Day)** | Participate 20 days in a row |

**Daily Completion Badges (Complete all 5 questions):**

| # | Badge | Trigger |
|---|-------|---------|
| 7 | **Daily Five (5-Day)** | Complete all 5 questions, 5 days in a row |
| 8 | **Daily Discipline (10-Day)** | Complete all 5 questions, 10 days in a row |
| 9 | **Daily Machine (20-Day)** | Complete all 5 questions, 20 days in a row |

> These 9 badges are "core retention" and should be very colorful.
> Add "seasonal/event badges" later (e.g., "Cardio Week Champion").

**Social Sharing:**
- Share badge as:
  - Image card (badge + username + level + short tagline)
  - Deep link back to the app (optional)
- Platforms: iOS share sheet (Facebook, X, iMessage, etc.)

---

### 6. Streaks & Progression (Support Systems)

- Track quiz streaks (daily completion, accuracy).
- Track poll streaks (consecutive participation).
- Accuracy streak (continuous correct answers).
- Display progression on profile + optionally on leaderboard.

*(MVP: track and show basic streak counters; badge unlocks are enough to motivate.)*

---

### 7. Settings & Personalization

- Edit Knowledge Level or focus/avoid topics.
- Notification settings for quiz/poll reminders.
- Sign out option.

---

## Key User Journey & Screen Flow

Each screen below lists its purpose, key elements, and required image assets.

### Screen 1: Welcome & Signup

App logo, tagline, and "Sign Up" or "Log In" button. Email/password fields or "Continue" if already logged in.

**Image Assets:**
- `app_logo.png` — App logo
- `welcome_hero.png` — Hero illustration

---

### Screen 2: Username & Knowledge Level Selection

Choose a unique username. Select Knowledge Level from Layperson through Physician/PA.

**Image Assets:**
- `level_layperson.png` — Layperson icon
- `level_EMT.png` — EMT icon
- `level_nurse.png` — Nurse/MA icon
- `level_pharmacist.png` — Pharmacist icon
- `level_physician.png` — Physician/PA icon

---

### Screen 3: Topic Preferences (Optional)

Checkboxes or tags to select preferred topics and topics to avoid.

**Image Assets:** None required (text/tag-based UI).

---

### Screen 4: Daily Quiz Home

Displays today's quiz availability (locked or unlocked). Button to start the quiz or see results if completed.

**Image Assets:**
- `quiz_ready_icon.png` — Quiz availability indicator

---

### Screen 5: Quiz Question (Repeated 5 Times)

Shows the question and multiple-choice answers. After selection, immediate feedback with explanation.

**Image Assets:** None required (text-driven UI).

---

### Screen 6: Quiz Summary

Shows daily score, correct/incorrect answers summary. Streak progress visible.

**Image Assets:**
- `summary_trophy.png` — Trophy / progress icon

---

### Screen 7: Live Poll (Only Available During Poll Window)

Displays the live poll question and answers. After answering, shows real-time stats of correct/incorrect distribution.

**Image Assets:**
- `poll_live_icon.png` — Live poll indicator

---

### Screen 8: Leaderboard

Displays tier-based rankings by accuracy or streaks. Shows username, rank, and score.

**Image Assets:**
- `leaderboard_top_icon.png` — Top rank icon

---

### Screen 9: Social Profile

Shows user's earned badges, streaks, and key stats. Option to view friend's profiles similarly.

**Image Assets:**
- `profile_avatar.png` — Default user avatar

---

### Screen 10: Badges Gallery

Grid of all possible badges (grayed if locked, colored if earned). Tap badge for details and share option.

**Image Assets:**
- `badge_pinpoint5.png` — Pinpoint x5 badge
- `badge_clinicalflow10.png` — Clinical Flow x10 badge
- `badge_attending20.png` — Attending Mode x20 badge
- `badge_poll3day.png` — Poll Regular badge
- `badge_poll10day.png` — Poll Committed badge
- `badge_poll20day.png` — Poll Veteran badge
- `badge_daily5day.png` — Daily Five badge
- `badge_daily10day.png` — Daily Discipline badge
- `badge_daily20day.png` — Daily Machine badge

---

### Screen 11: Settings

Adjust Knowledge Level or topic preferences. Manage notifications (daily quiz, poll reminders). Log out option.

**Image Assets:** None required.

---

### Screen 12: Notification Landing (Optional)

If opened from a notification, displays quiz/poll reminders or results directly. Deep-links user to the relevant screen (quiz or poll).

**Image Assets:**
- `notification_alert.png` — Alert / reminder icon

---

## Question Bank Management (Content Engine)

- **Seeded pools per level** (goal: 100+ per level to cover ~20 days at 5/day)
- Questions tagged with:
  - Knowledge Level
  - Topic (e.g., cardiology, pharm, genetics)
  - Difficulty
- Rotation rules:
  - No repeats until pool exhausted (per level + topic filter)
  - Safe fallback if user excludes too many topics (show prompt to adjust preferences)

### Content Strategy
- MVP: seeded static JSON or DB entries
- Later: admin tooling + periodic imports + optional LLM-assisted generation w/ human review

---

## Image Asset Manifest

Complete list of all image assets required for the app, grouped by screen.

| Screen | Filename | Description |
|--------|----------|-------------|
| Welcome & Signup | `app_logo.png` | App logo |
| Welcome & Signup | `welcome_hero.png` | Hero illustration |
| Knowledge Level Selection | `level_layperson.png` | Layperson tier icon |
| Knowledge Level Selection | `level_EMT.png` | EMT tier icon |
| Knowledge Level Selection | `level_nurse.png` | Nurse/MA tier icon |
| Knowledge Level Selection | `level_pharmacist.png` | Pharmacist tier icon |
| Knowledge Level Selection | `level_physician.png` | Physician/PA tier icon |
| Daily Quiz Home | `quiz_ready_icon.png` | Quiz availability indicator |
| Quiz Summary | `summary_trophy.png` | Trophy / progress icon |
| Live Poll | `poll_live_icon.png` | Live poll indicator |
| Leaderboard | `leaderboard_top_icon.png` | Top rank icon |
| Social Profile | `profile_avatar.png` | Default user avatar |
| Badges Gallery | `badge_pinpoint5.png` | Pinpoint x5 badge |
| Badges Gallery | `badge_clinicalflow10.png` | Clinical Flow x10 badge |
| Badges Gallery | `badge_attending20.png` | Attending Mode x20 badge |
| Badges Gallery | `badge_poll3day.png` | Poll Regular badge |
| Badges Gallery | `badge_poll10day.png` | Poll Committed badge |
| Badges Gallery | `badge_poll20day.png` | Poll Veteran badge |
| Badges Gallery | `badge_daily5day.png` | Daily Five badge |
| Badges Gallery | `badge_daily10day.png` | Daily Discipline badge |
| Badges Gallery | `badge_daily20day.png` | Daily Machine badge |
| Notification Landing | `notification_alert.png` | Alert / reminder icon |

**Total: 22 image assets**

---

## Tech Stack (Suggested)

### Client (iOS)
- **Expo (React Native)** on Windows dev machine
- Expo Go for fast testing
- **TestFlight** for distribution
- State: React Query (or Zustand) + AsyncStorage for local cache
- Navigation: Expo Router (file-based routing)
- UI: React Native Paper

### Backend (Minimal, MVP)
- **Supabase** (Postgres + Auth + Edge Functions + Storage + Realtime)
- Auth: Supabase Auth (email/password)
- Storage (optional): Supabase Storage for badge share images

### Notifications
- **Expo Push Notifications** (Expo's push service + device tokens)

### Optional AI (not required for MVP)
- OpenAI API for:
  - Prompt Polisher feature (separate module)
  - Generating new questions (offline/batch only, not user-facing "medical advice")

---

## API Endpoints (Internal)

### Auth & Users
- `POST /auth/signup` — email + password, create user
- `POST /auth/login` — email + password, returns token
- `POST /auth/logout`
- `GET /me` — current user profile
- `PATCH /me` — update username, level, topics include/exclude, notification prefs
- `GET /users/:username` — public profile (badges, stats)
- `GET /users/lookup?username=...` — username search

### Daily Quiz
- `GET /daily-quiz/today` — returns 5 questions (level + preferences applied)
- `POST /daily-quiz/answer` — submit answer `{questionId, choiceIndex}`
- `GET /daily-quiz/status` — answered count, remaining, score so far

### Live Poll
- `GET /poll/today` — returns poll question if within window + live stats
- `POST /poll/answer` — submit poll answer (one-time)
- `GET /poll/stats` — correct/incorrect distribution + totals

### Leaderboards
- `GET /leaderboard?level=EMT&period=7d` — ranks + scores
- `GET /leaderboard/me` — my rank snapshot

### Badges & Achievements
- `GET /badges/catalog` — list all badges (id, name, artwork ref, unlock rules)
- `GET /badges/me` — earned badges + counts + locked status
- `POST /badges/share` — returns shareable image URL (optional) or share payload

### Social
- `POST /social/request` — send friend request / follow
- `POST /social/accept` — accept request (if using requests)
- `POST /social/remove` — unfollow/unfriend
- `GET /social/connections` — my friends/following
- `GET /social/requests` — pending requests

### Notifications
- `POST /notifications/register-device` — store Expo push token
- `PATCH /notifications/preferences` — opt in/out
- (Server cron) `POST /jobs/send-daily-quiz-notification`
- (Server cron) `POST /jobs/send-poll-open-notification`
- (Server cron) `POST /jobs/send-poll-reminder-notification`

---

## External Services / Endpoints Touched

- Expo Push Service (push notifications)
- (Optional) OpenAI API for:
  - Prompt Polisher
  - Offline question generation/batch expansion

---

## MVP Build Notes

- Keep medical content clearly educational:
  - "Training / trivia / learning" framing
  - No personal medical advice or diagnosis
- Start with:
  - 3 levels (Layperson, EMT, Physician/PA) + expand later
  - 1-3 topics to prove the model (e.g., cardiology basics, pharm safety, genetics)
- Seed 100 questions per level for the first real run, then add a "content refresh" job every ~20 days
