# TaskForge Playwright Suite

TypeScript (Page Object Model) + Playwright end-to-end tests for `https://mytaskforge.net/`.

## Project structure

```text
pages/        Page objects: all locators and page actions live here
  BasePage.ts
  AppShellPage.ts
  HomePage.ts
  TasksPage.ts
  CalendarPage.ts
  LoginPage.ts
  SchedulePage.ts
  TimeClockPage.ts
  TimesheetsPage.ts
  LeavePage.ts
  LaborCostPage.ts
  WorkspacePage.ts
fixtures/     Playwright fixtures that inject page objects and credentials
  auth.fixture.ts
  pages.fixture.ts
utils/        Shared auth, env and navigation helpers
tests/        Specs and the auth setup project
```

Follow the Page Object Model: specs call page-object methods and must not use
`page.locator(...)` or page-specific `getByRole(...)` directly. Add a new method
to the relevant page object instead.

## Prerequisites

- Node.js 20+ on macOS or Windows.
- Google Chrome installed (the `*-chrome` projects use `channel: "chrome"`).
- `.env` at the project root:

```dotenv
BASE_URL = https://mytaskforge.net/
owner_email = <owner sign-in email>
owner_password = "<owner password>"
# optional, defaults to /abdul-s-workspace
WORKSPACE_PATH = /abdul-s-workspace
```

`.env` is gitignored. Never commit credentials or storage state. Quote the
password if it contains `#`; dotenv treats an unquoted `#` as a comment.

## Install
 
```sh
npm install
```

`postinstall` downloads the Playwright Chromium, Firefox and WebKit builds.
The Chrome projects still use your installed Google Chrome.

## Projects

| Project | Files | Auth state | Purpose |
|---|---|---|---|
| `auth-chrome`, `auth-firefox`, `auth-webkit` | `tests/00-auth.spec.ts` | empty | Standalone auth coverage; every test starts logged out |
| `setup` | `tests/auth.setup.ts` | empty | Logs in once and writes `playwright/.auth/user.json` |
| `modules-chrome`, `modules-firefox`, `modules-webkit` | `tests/0[1-9]-*.spec.ts`, `tests/1[0-9]-*.spec.ts` | saved | Module specs reuse the saved session |

Run everything:

```sh
npm test
```

Run only auth (all three browsers):

```sh
npm run test:auth:all
```

Refresh the saved session without running module tests:

```sh
npm run test:setup
```

Type-check:

```sh
npm run typecheck
```

HTML report:

```sh
npm run report
```

## Auth coverage (`tests/00-auth.spec.ts`)

`Login page UI`

1. Renders the form, password toggle, forgot-password and register links.
2. Empty fields show inline validation without calling the sign-in API.
3. An invalid email format is rejected before the sign-in API.
4. Password visibility toggles without losing the value.

`Authentication`

5. Valid owner credentials authenticate and return a JSON API response.
6. Invalid credentials return `401` and do not create a session.
7. Authenticated `storageState` persists into a new browser context.
8. A fresh unauthenticated context is redirected from protected routes.
9. Logout clears the session and protects workspace routes.
10. Clearing session cookies redirects protected routes to login.
11. QA-003 regression guard: repeated fresh-context sign-ins are consistent.

Animations/loading are handled with visibility and response/URL assertions, not
fixed sleeps. The suite is serial (`workers: 1`) because it uses one shared owner
account.

## Module coverage

| # | Module | Spec | Page object |
|---|---|---|---|
| 01 | Home | `tests/01-home.spec.ts` | `pages/HomePage.ts` (extends `AppShellPage`) |
| 02 | Tasks | `tests/02-tasks.spec.ts` | `pages/TasksPage.ts` (extends `AppShellPage`) |
| 03 | Calendar | `tests/03-calendar.spec.ts` | `pages/CalendarPage.ts` (extends `AppShellPage`) |
| 04 | Schedule | `tests/04-schedule.spec.ts` | `pages/SchedulePage.ts` (extends `AppShellPage`) |
| 05 | Time clock | `tests/05-time-clock.spec.ts` | `pages/TimeClockPage.ts` (extends `AppShellPage`) |
| 06 | Timesheets | `tests/06-timesheets.spec.ts` | `pages/TimesheetsPage.ts` (extends `AppShellPage`) |
| 07 | Leave | `tests/07-leave.spec.ts` | `pages/LeavePage.ts` (extends `AppShellPage`) |
| 08 | Labor cost | `tests/08-labor-cost.spec.ts` | `pages/LaborCostPage.ts` (extends `AppShellPage`) |
| 09 | Payroll | planned | planned |
| 10 | Working now | planned | planned |
| 11 | Chat | planned | planned |
| 12 | Announcements | planned | planned |
| 13 | Notifications | planned | planned |
| 14 | Projects | planned | planned |
| 15 | Departments | planned | planned |
| 16 | Employees | planned | planned |
| 17 | Settings | planned | planned |

### Module 1 — Home

Read-only checks: dashboard load and greeting, six KPI cards with well-formed
values, setup checklist link targets plus one navigation test per step, quick
access links, My day widgets and leave balances, loading-skeleton replacement
(QA-007), and the global shell/sidebar plus realtime status (QA-001).

Module specs use `fixtures/pages.fixture.ts`, which injects page objects and a
saved-session restore hook. A transient `/login` redirect on module navigation is
retried once without repeating UI login; auth behaviour itself stays covered by
`tests/00-auth.spec.ts`.

### Module 2 — Tasks

Read-only checks: module load, numeric tab counts, all five tab routes and
selection state, per-tab zero-state copy, search no-match and clear behaviour,
Status + Priority filter combinations with clear-filters recovery, filter
popover option sets, and the due-from/due-until date-range controls. Task
creation, editing, completion and deletion are deferred because they mutate the
shared workspace.

### Module 3 — Calendar

Read-only checks: month view load, month grid structure, previous/next/Today
navigation and Today disabled state on the current period, Month/Week view
switching with a seven-day week grid and week navigation, independent layer
toggles, Department/Project/Employee filter combinations with clear-filters
recovery, filter option/search-box inventories, and the empty-month copy over an
intact grid. Event drill-down, timezone-boundary placement and event show/hide
verification are deferred until scheduled data exists.

### Module 4 — Schedule

Read-only checks: weekly grid load, seven day columns tied to the week label,
employee rows with one add-shift action per day, Previous/Next/This week
navigation with stable employee rows, My shifts toggle with the personal empty
state, department/office filter option sets, department filter apply/clear,
publish and discard gating with no drafts, empty-schedule zero-hour state, and
the Add shift draft dialog defaults with a clean cancel. Shift creation,
Copy last week, Discard drafts, publishing and overlap validation are deferred
because they mutate the shared workspace.

### Module 5 — Time clock

Read-only checks: live clock and date formatting, current clock state and timer,
the off-clock action and location notice, project picker options with selection
and reset back to No project, today's worked time/entry count with the zero state,
and the weekly total plus seven-day chart. Clock in/out, breaks and job switching
are deferred because they mutate the owner's time entry and shared workspace.

### Module 6 — Timesheets

Read-only checks: current pay period with summary cards and seven daily rows,
Previous/Next/This period navigation, My timesheet/Team tabs with URL sync, team
rows with status/hours/overtime/flags/pay, Approve selected row-selection gating,
and the Add entry dialog defaults, project/office/break options, reason
requirement, clock-order validation and clean cancel. Submitting, approving and
saving manual entries are deferred because they mutate the shared workspace.
The empty-timesheet Submit state is annotated as QA-006 and is never activated.

### Module 7 — Leave

Read-only checks: balance cards for Vacation, Sick, Personal and unpaid leave,
My leave/Requests/Calendar tabs with URL sync, the personal empty-request state,
the team request queue status filters (Pending/Approved/Rejected/Cancelled/All),
and month navigation on the leave calendar with weekday headers, a 28–42-cell
week grid (35 or 42 cells depending on the month), out-of-month dimming, the
today highlight and the Approved/Pending legend. The Request leave dialog is
covered for its owner/type options, default dates, length radios and preview,
optional reason, end-before-start validation and a clean cancel that leaves
balances and requests unchanged. Submitting, approving, rejecting and cancelling
leave are deferred because they mutate the shared workspace. Choosing dates only
calls the dialog's non-mutating preview endpoint. Correcting an end-before-start
range restores the preview and enables Send request but leaves the Length control
hidden; that state is annotated as QA-013 and is never submitted.

### Module 8 — Labor cost

Read-only checks: the report shell with the current week and export link, all
five preset ranges with the range summary and export dates in sync, custom
from/to date pickers with the pending prompt and export gating, and the
Employee/Project/Department/Office groupings with their matching columns and
row/footer totals. Department, Office and Project filter option sets are
inventoried and the Department/Project filters are applied, cleared and checked
against the export query. The Approved-only switch is toggled and checked in the
export query, and empty or populated results are validated without broken
values. Exporting is verified through the CSV link's query only; no download is
started and no workspace data is changed.

## Known constraints handled by the helpers

- **Rate limiting:** Better Auth limits `/sign-in/email`; TaskForge returns
  `429` with `X-Retry-After`. `utils/auth.ts` paces submissions and
  retries after the advertised delay. Do not run multiple auth tests in
  parallel with the same account.
- **Hydration:** submitting `/login` before React attaches `onSubmit` causes a
  native GET and puts the password in the URL (QA-012). The helper waits for
  React's form handler before filling/submitting.
- **Transient network/DNS errors:** `gotoWithRetry` retries
  `ERR_NAME_NOT_RESOLVED` / `ERR_NETWORK_CHANGED` navigations.
- **Realtime host:** `api.mytaskforge.net` does not resolve (QA-001), so tests
  must assert persisted HTTP state and must not depend on live updates.
- **Free plan limits:** members `5/5`, projects `1/1` (QA-005). Creation tests
  need a staging workspace or explicit approval/data cleanup.

## Adding module specs

Create files in order:

```text
tests/01-home.spec.ts
tests/02-tasks.spec.ts
...
tests/17-settings.spec.ts
```

The `modules-*` projects automatically pick up `01` through `17` and supply
`playwright/.auth/user.json`. Keep tests non-destructive unless the scenario is
explicitly approved. Reuse the `loginPage` / `workspacePage` fixtures rather
than logging in or querying the DOM inside each spec.

## Safety

- No application source code is modified by this suite.
- Tests sign in/out and read pages; they do not create, update or delete
  workspace records.
- Do not commit `.env`, `playwright/.auth/`, `test-results/` or
  `playwright-report/` — all are gitignored.
