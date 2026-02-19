# Pulse Rank — Next Steps

## 1. Missing Image Assets

We currently only have `app_logo.png`. The following **21 images** still need to be created and placed in the `assets/` directory.

### Branding & UI

| Filename | Location | Description |
|----------|----------|-------------|
| `welcome_hero.png` | `assets/branding/` | Hero illustration for the Welcome/Signup screen |
| `quiz_ready_icon.png` | `assets/icons/` | Quiz availability indicator on the Home screen |
| `summary_trophy.png` | `assets/icons/` | Trophy/progress icon on the Quiz Summary screen |
| `poll_live_icon.png` | `assets/icons/` | Live poll indicator on the Poll screen |
| `leaderboard_top_icon.png` | `assets/icons/` | Top rank icon on the Leaderboard screen |
| `profile_avatar.png` | `assets/icons/` | Default user avatar for profiles |
| `notification_alert.png` | `assets/icons/` | Alert/reminder icon for notification landing |

### Knowledge Level Icons (Onboarding & Profile)

| Filename | Location | Description |
|----------|----------|-------------|
| `level_layperson.png` | `assets/tiers/` | Layperson / Beginner tier icon |
| `level_EMT.png` | `assets/tiers/` | EMT tier icon |
| `level_nurse.png` | `assets/tiers/` | Nurse / MA tier icon |
| `level_pharmacist.png` | `assets/tiers/` | Pharmacist tier icon |
| `level_physician.png` | `assets/tiers/` | Physician / PA tier icon |

### Badge Images (Badges Gallery — should be highly colorful)

| Filename | Location | Description |
|----------|----------|-------------|
| `badge_pinpoint5.png` | `assets/badges/` | Pinpoint x5 — 5 correct in a row |
| `badge_clinicalflow10.png` | `assets/badges/` | Clinical Flow x10 — 10 correct in a row |
| `badge_attending20.png` | `assets/badges/` | Attending Mode x20 — 20 correct in a row |
| `badge_poll3day.png` | `assets/badges/` | Poll Regular — 3-day poll streak |
| `badge_poll10day.png` | `assets/badges/` | Poll Committed — 10-day poll streak |
| `badge_poll20day.png` | `assets/badges/` | Poll Veteran — 20-day poll streak |
| `badge_daily5day.png` | `assets/badges/` | Daily Five — 5-day quiz completion streak |
| `badge_daily10day.png` | `assets/badges/` | Daily Discipline — 10-day quiz completion streak |
| `badge_daily20day.png` | `assets/badges/` | Daily Machine — 20-day quiz completion streak |

---

## 2. Question Topics

These are the 12 selectable topics users can choose as "focus" or "avoid." Questions need to be built for each topic, at each of the 5 knowledge levels.

| # | Key | Label | Icon |
|---|-----|-------|------|
| 1 | `cardiology` | Cardiology | heart |
| 2 | `pharmacology` | Pharmacology | pill |
| 3 | `genetics` | Genetics | dna |
| 4 | `neurology` | Neurology | brain |
| 5 | `respiratory` | Respiratory | lungs |
| 6 | `trauma` | Trauma & Emergency | ambulance |
| 7 | `infectious` | Infectious Disease | virus |
| 8 | `endocrine` | Endocrine | water |
| 9 | `gi` | Gastrointestinal | stomach |
| 10 | `musculoskeletal` | Musculoskeletal | bone |
| 11 | `renal` | Renal | kidney |
| 12 | `hematology` | Hematology | blood-bag |

### Knowledge Levels (questions needed at each)

| # | Key | Label |
|---|-----|-------|
| 1 | `layperson` | Layperson / Beginner |
| 2 | `emt` | EMT |
| 3 | `nurse_ma` | Nurse / Medical Assistant |
| 4 | `pharmacist` | Pharmacist |
| 5 | `physician_np_pa` | Physician / PA |

### Question Format

Each question needs:
- `question_text` — the question
- `choices` — array of 4 answer options
- `correct_index` — which choice is correct (0-3)
- `explanation` — why the correct answer is right
- `topic` — one of the 12 topic keys above
- `tier` — one of the 5 knowledge level keys above
- `difficulty` — optional 1-5 scale

**Goal:** 100+ questions per knowledge level to cover ~20 days at 5/day.

---

## 3. Known Bugs to Fix

### Refresh loops back to onboarding
On browser refresh, the app always redirects to the "Select Your Knowledge Level" onboarding screen, even for users who already completed onboarding. The `isOnboarded` flag in Zustand resets to `false` on page reload because it's only held in memory. Fix: persist the onboarded state so it survives refreshes, and move tier/topic editing to Profile Settings.

---

## 4. Remaining Build Work

- **Profile Settings screen** — allow users to change Knowledge Level and topic preferences after initial setup
- **Quiz flow** — seed question data in Supabase and test end-to-end daily quiz
- **Poll flow** — seed poll data and test the 8-10 PM ET window
- **Leaderboard** — populate with real data once quiz answers exist
- **Badges** — hook up badge-check logic (Edge Function or client-side after quiz)
- **Social layer** — friend/follow, profile viewing
- **Push notifications** — register device tokens, set up cron jobs for quiz/poll reminders
- **iOS build** — EAS Build to TestFlight

---

## 5. Quick Reference — All Image Filenames

```
welcome_hero.png
quiz_ready_icon.png
summary_trophy.png
poll_live_icon.png
leaderboard_top_icon.png
profile_avatar.png
notification_alert.png
level_layperson.png
level_EMT.png
level_nurse.png
level_pharmacist.png
level_physician.png
badge_pinpoint5.png
badge_clinicalflow10.png
badge_attending20.png
badge_poll3day.png
badge_poll10day.png
badge_poll20day.png
badge_daily5day.png
badge_daily10day.png
badge_daily20day.png
```

## 6. Quick Reference — All 12 Topics

```
Cardiology
Pharmacology
Genetics
Neurology
Respiratory
Trauma & Emergency
Infectious Disease
Endocrine
Gastrointestinal
Musculoskeletal
Renal
Hematology
```
