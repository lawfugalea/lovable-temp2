# Clankeep — App Store submission pack

Prepared 2026-08-08. This is the material to paste into App Store Connect, plus
the reasoning behind each answer so it can be checked rather than trusted.

Verify the exact wording of Apple's questions in App Store Connect as you go —
Apple revises the privacy and age-rating questionnaires periodically, and the
answers below describe *what the app does*, which is the part that does not
change.

## App record

| Field | Value |
| --- | --- |
| Bundle ID | `com.clankeep.mobile` |
| Version | 1.0.0 |
| Primary category | Productivity (secondary: Lifestyle) |
| Support URL | **needed from Ryan** — a page that exists and answers contact |
| Privacy policy URL | `https://clankeep.com/privacy` |
| Terms | `https://clankeep.com/terms` |

Do **not** pick Medical as the category. The app records doses a carer has
already decided on; it does not diagnose, calculate dosage, or advise. Choosing
Medical invites a review standard the app is not built to meet.

## Privacy nutrition labels

The app contains **no analytics, attribution, or advertising SDK** (verified
against `apps/mobile/package.json`). So:

- **Data used to track you: none.** Nothing is shared with data brokers or used
  for cross-app advertising.
- Everything below is **collected and linked to the user's identity**, because
  it lives in their household account, and is used **solely for App
  Functionality**.

| Apple data type | What it actually is |
| --- | --- |
| Contact Info → Name, Email Address | Account identity, household member names, invitations |
| Health & Fitness → Health | Medicines, doses, temperature readings, weights, illness episodes |
| Financial Info → Other Financial Info | Planned income, commitments and savings goals; and, where Open Banking is enabled, read-only account balances and transactions |
| User Content → Photos or Videos | Images attached to notes |
| User Content → Other User Content | Notes, shopping lists, chores, meal plans |
| Identifiers → User ID | The account identifier the app's bearer token resolves to |
| Purchases → Purchase History | **Only once RevenueCat ships.** Add this with the IAP release, not before |

Not collected: precise location, contacts, browsing history, search history,
diagnostics, advertising identifiers.

Financial data is read-only. Clankeep cannot move money or initiate payments —
state that plainly in the review notes; it heads off the obvious question.

## Age rating

The questionnaire will ask about medical/treatment information. Answer
truthfully: the app stores medicine and health records a parent enters for their
own household. It contains no drug references in the promotional sense, no user
generated content shared publicly, and no unrestricted web access — the note
editor's WebView is an isolated `about:blank` document with a restrictive CSP
that blocks external navigation, which is worth mentioning if the web-access
question comes up.

## Demo account for App Review — required

Every screen is behind sign-in and a household, so a reviewer with no account
sees only the login screen and will reject for that alone.

Provide a **real, working account** that has:

- an active household with a couple of members,
- some shopping, chores, meals and notes so screens are not empty,
- at least one child with a medicine and a couple of doses, so Health is not blank,
- Family plan entitlement, so Finance is reachable,
- **no real personal or health data belonging to your family.**

Put the credentials in App Store Connect's review notes, not in this repo.

## Review notes (draft — paste and adjust)

> Clankeep is a private household organiser for one family: shopping, chores,
> meals, notes, medicine records and household budgeting. All content belongs to
> the signed-in user's household and is never shared publicly.
>
> A demo account is provided above. Sign in with it to reach every feature.
>
> Health: the app records medicines and doses that a carer has already decided
> on, so a household can see what was given and when. It does not diagnose,
> recommend, or calculate dosage, and it displays a warning that the medicine
> label and a clinician remain the source of truth.
>
> Finance: where a household has connected a bank through our regulated Open
> Banking provider, Clankeep displays balances and transactions **read-only**.
> The app cannot move money, make payments, or initiate transfers.
>
> The app makes no use of tracking, advertising or analytics SDKs.

## Screenshots

`supportsTablet` is true, so **iPad screenshots are required as well as iPhone**.
Check current required sizes in App Store Connect; at time of writing that means
one 6.9"/6.7" iPhone set and one 13" iPad set.

Suggested six, in order — they tell the story and avoid empty states:

1. Home with household summaries
2. Shop with the aisle route grouping
3. Plan (chores + meals)
4. Notes with a checklist note
5. Health overview showing a medicine schedule and its safety warning
6. Finance planner

Use the demo household so no real family data is published. Screenshots are
public forever.

## Already handled in the repo

- Export compliance: `ios.config.usesNonExemptEncryption: false` in `app.json`,
  so uploads do not stall on the encryption question. The app uses HTTPS only.
- In-app account deletion (guideline 5.1.1(v)): Family & Account → Delete your
  account, password confirmed, sharing the web's erasure logic.
- No external purchase steering (guideline 3.1.1): plan-gated screens state the
  feature is not on the household's plan and offer no outside purchase path.
- Build numbers: EAS remote version source with `autoIncrement`.

## Still open before submission

1. `eas init` — needs Ryan's Expo account; nothing builds without a project id.
2. Deploy the merged branch so `https://clankeep.com/api/mobile/v1` exists. It
   currently 404s, and the production build profile points there.
3. RevenueCat in-app purchase, and the `Purchases → Purchase History` label that
   goes with it.
4. Support URL, and the demo account above.
