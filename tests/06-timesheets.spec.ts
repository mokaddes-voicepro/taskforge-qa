import { test, expect } from '../fixtures/pages.fixture';
import { addDays } from '../pages/TimesheetsPage';

const DAY_MS = 86_400_000;

/**
 * Module 6 — Timesheets.
 *
 * Read-only coverage: current weekly pay period, previous/next/This period
 * navigation, summary cards, seven daily rows, My timesheet/Team tabs, team
 * rows and approval gating, plus the Add entry dialog defaults, options,
 * break controls and validation. Submitting, approving and saving manual
 * entries are intentionally out of scope because they mutate the shared
 * workspace.
 *
 * Run: npm run test:modules:chrome -- tests/06-timesheets.spec.ts
 */
test.describe('Timesheets (Module 6)', () => {
  test('loads the current pay period with summaries and seven daily rows', async ({
    timesheetsPage,
  }) => {
    await timesheetsPage.goto();

    await timesheetsPage.expectTitle(/Timesheets .+ TaskForge/i);
    await timesheetsPage.expectPath(timesheetsPage.workspaceHref('/timesheets'));
    await timesheetsPage.expectLoaded();

    const range = await timesheetsPage.periodRange();

    expect(
      range.end.getTime() - range.start.getTime(),
      'Pay period should span seven days',
    ).toBe(6 * DAY_MS);

    const total = await timesheetsPage.totalDuration();

    if (total === '0m' && (await timesheetsPage.submitButton.isEnabled())) {
      test.info().annotations.push({
        type: 'known-issue',
        description:
          'QA-006: Submit stays enabled on an empty timesheet; this suite never activates it.',
      });
    }

    if (total === '0m') {
      await timesheetsPage.expectEmptyDailyRows();
    }

    await timesheetsPage.expectNoBrokenValues();
  });

  test('navigates by whole pay periods and returns to the current period', async ({
    timesheetsPage,
  }) => {
    await timesheetsPage.goto();

    const currentLabel = await timesheetsPage.periodLabel();
    const currentRange = await timesheetsPage.periodRange();

    await timesheetsPage.nextPeriod();
    await timesheetsPage.expectPeriodStarts(addDays(currentRange.start, 7));
    await timesheetsPage.expectSummary();
    await timesheetsPage.expectDailyRows();
    await expect(timesheetsPage.thisPeriodButton).toBeEnabled();

    await timesheetsPage.nextPeriod();
    await timesheetsPage.expectPeriodStarts(addDays(currentRange.start, 14));
    await timesheetsPage.expectDailyRows();

    await timesheetsPage.previousPeriod();
    await timesheetsPage.expectPeriodStarts(addDays(currentRange.start, 7));
    await timesheetsPage.expectDailyRows();

    await timesheetsPage.goToThisPeriod(currentLabel);
    await timesheetsPage.expectPeriodStarts(currentRange.start);
    await timesheetsPage.expectDailyRows();
    await expect(timesheetsPage.thisPeriodButton).toBeDisabled();

    await timesheetsPage.expectPath(timesheetsPage.workspaceHref('/timesheets'));
    await timesheetsPage.expectNoBrokenValues();
  });

  test('switches between My timesheet and Team with URL-synced tabs', async ({
    timesheetsPage,
  }) => {
    await timesheetsPage.goto();

    await timesheetsPage.expectTab('mine');
    await timesheetsPage.expectSummary();
    await timesheetsPage.expectDailyRows();

    await timesheetsPage.selectTab('team');
    await timesheetsPage.expectTeamTable();
    await expect(timesheetsPage.addEntryButton).toBeHidden();
    await expect(timesheetsPage.submitButton).toBeHidden();

    await timesheetsPage.selectTab('mine');
    await timesheetsPage.expectSummary();
    await timesheetsPage.expectDailyRows();
    await expect(timesheetsPage.addEntryButton).toBeVisible();
    await expect(timesheetsPage.submitButton).toBeVisible();

    await timesheetsPage.expectNoBrokenValues();
  });

  test('renders team rows and gates Approve selected on row selection', async ({
    timesheetsPage,
  }) => {
    await timesheetsPage.goto();
    await timesheetsPage.selectTab('team');

    await timesheetsPage.expectTeamTable();
    await timesheetsPage.expectApproveGating();
    await timesheetsPage.expectNoBrokenValues();
  });

  test('opens the Add entry dialog with defaults and cancels cleanly', async ({
    timesheetsPage,
  }) => {
    await timesheetsPage.goto();

    const totalBefore = await timesheetsPage.totalDuration();
    const entriesBefore = await timesheetsPage.dayEntryTexts();

    await timesheetsPage.openAddEntryDialog();
    await timesheetsPage.expectAddEntryDialog();
    await timesheetsPage.expectProjectOptions();
    await timesheetsPage.expectOfficeOptions();
    await timesheetsPage.addBreak();
    await timesheetsPage.expectBreakTypeOptions();
    await timesheetsPage.removeBreak();
    await timesheetsPage.cancelAddEntryDialog();

    expect(
      await timesheetsPage.totalDuration(),
      'Cancelling the dialog must not create a time entry',
    ).toBe(totalBefore);
    expect(
      await timesheetsPage.dayEntryTexts(),
      'Daily rows must stay unchanged after cancelling',
    ).toEqual(entriesBefore);
    await timesheetsPage.expectNoBrokenValues();
  });

  test('validates the manual entry reason and clock order without saving', async ({
    timesheetsPage,
  }) => {
    await timesheetsPage.goto();

    await timesheetsPage.openAddEntryDialog();
    await timesheetsPage.expectAddEntryDialog();
    await timesheetsPage.usePastEntryDate();
    await timesheetsPage.fillReason();
    await timesheetsPage.clearReason();
    await timesheetsPage.fillReason();
    await timesheetsPage.expectClockOrderValidation();
    await timesheetsPage.cancelAddEntryDialog();

    await timesheetsPage.expectDailyRows();
    await timesheetsPage.expectNoBrokenValues();
  });
});
