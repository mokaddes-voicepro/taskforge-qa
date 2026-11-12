import { test, expect } from '../fixtures/pages.fixture';

/**
 * Module 10 — Working now.
 *
 * Read-only coverage: board loading, location groups, the On the clock, On break
 * and Not in yet sections with their counts/copy/flags, the on-leave-today card,
 * and the empty state. The clock-out confirmation is opened, checked and
 * cancelled; clocking anyone out is never confirmed and no workspace data is
 * changed.
 *
 * Run: npm run test:modules:chrome -- tests/10-working-now.spec.ts
 */
test.describe('Working now (Module 10)', () => {
  test('loads the board with its location groups or empty state', async ({
    workingNowPage,
  }) => {
    await workingNowPage.goto();

    await workingNowPage.expectTitle(/Working now .+ TaskForge/i);
    await workingNowPage.expectPath(
      workingNowPage.workspaceHref('/working-now'),
    );
    await workingNowPage.expectLoaded();

    const snapshot = await workingNowPage.snapshot();

    if (snapshot.locations.length === 0) {
      await workingNowPage.expectEmptyState();
    } else {
      expect(
        snapshot.locations.length,
        'Working-now location groups',
      ).toBeGreaterThan(0);

      for (const location of snapshot.locations) {
        expect(location.title, 'Working-now location title').not.toBe('');
      }
    }

    await workingNowPage.expectNoBrokenValues();
  });

  test('keeps section counts, row copy, flags and clock-out actions in sync', async ({
    workingNowPage,
  }) => {
    await workingNowPage.goto();

    const snapshot = await workingNowPage.snapshot();

    test.skip(
      snapshot.locations.length === 0,
      'No location groups are rendered while nobody is on the clock.',
    );

    // Section titles, counts, row copy, flags and clock-out actions are all
    // asserted against this same snapshot inside the page object.
    await workingNowPage.expectSections(snapshot);
  });

  test('opens and cancels the clock-out confirmation without changing rows', async ({
    workingNowPage,
  }) => {
    await workingNowPage.goto();

    const entry = await workingNowPage.firstClockOutEntry();

    test.skip(
      !entry,
      'Nobody is on the clock, so there is no clock-out action to inspect.',
    );

    const labelsBefore = await workingNowPage.clockOutLabels();

    expect(
      labelsBefore.length,
      'On-the-clock clock-out actions',
    ).toBeGreaterThan(0);

    const name = await workingNowPage.openFirstClockOutDialog();

    expect(name).toBe(entry?.name);
    await workingNowPage.expectClockOutDialog(name);
    await workingNowPage.cancelClockOutDialog();

    expect(
      await workingNowPage.clockOutLabels(),
      'Cancelling the dialog must not clock anyone out',
    ).toEqual(labelsBefore);
    await workingNowPage.expectPath(
      workingNowPage.workspaceHref('/working-now'),
    );
    await workingNowPage.expectNoBrokenValues();
  });

  test('shows the on-leave-today card when people are on leave', async ({
    workingNowPage,
  }) => {
    await workingNowPage.goto();

    const snapshot = await workingNowPage.snapshot();

    test.skip(
      snapshot.onLeave.length === 0,
      'Nobody is on leave today in the shared workspace.',
    );

    await workingNowPage.expectOnLeaveToday(snapshot.onLeave);
    await workingNowPage.expectNoBrokenValues();
  });
});
