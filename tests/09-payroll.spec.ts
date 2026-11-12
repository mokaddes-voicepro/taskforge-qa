import { test, expect } from '../fixtures/pages.fixture';
import {
  addDays,
  formatIsoDate,
  lastCompletedPeriod,
  parsePayrollPeriod,
  todayAsUtc,
} from '../pages/PayrollPage';

const DAY_MS = 86_400_000;

/**
 * Module 9 — Payroll.
 *
 * Read-only coverage: the last completed weekly period, Previous/Next and Last
 * completed period navigation, export detail/summary links, the
 * unapproved-timesheets warning and its team-queue link, the empty state, and
 * same-year/cross-year period labels. When approved timesheets exist, the
 * employee table, footer totals and expandable adjustment details are checked
 * too; otherwise that test skips. Exporting is checked through the CSV links
 * only; no download is started and no payroll data is changed.
 *
 * Run: npm run test:modules:chrome -- tests/09-payroll.spec.ts
 */
test.describe('Payroll (Module 9)', () => {
  test('loads the last completed period with exports, note and empty state', async ({
    payrollPage,
  }) => {
    await payrollPage.goto();

    await payrollPage.expectTitle(/Payroll .+ TaskForge/i);
    await payrollPage.expectPath(payrollPage.workspaceHref('/reports/payroll'));
    await payrollPage.expectLoaded();

    const range = await payrollPage.periodRange();
    const expected = lastCompletedPeriod();

    expect(range.start.getUTCDay(), 'Payroll week starts Monday').toBe(1);
    expect(
      range.end.getTime() - range.start.getTime(),
      'Payroll period should span seven days',
    ).toBe(6 * DAY_MS);
    expect(range.start.getTime(), 'Last completed period start').toBe(
      expected.start.getTime(),
    );
    expect(range.end.getTime(), 'Last completed period end').toBe(
      expected.end.getTime(),
    );
    expect(
      range.end.getTime(),
      'The last completed period should end before today',
    ).toBeLessThan(todayAsUtc().getTime());

    await payrollPage.expectExports(range.start);
    await payrollPage.expectNote();
    await payrollPage.expectEmptyOrResults();
    await payrollPage.expectNoBrokenValues();
  });

  test('navigates by whole weeks and resets to the last completed period', async ({
    payrollPage,
  }) => {
    await payrollPage.goto();

    const initial = await payrollPage.periodRange();
    const previousStart = addDays(initial.start, -7);
    const previousEnd = addDays(initial.end, -7);

    await payrollPage.previousPeriod();
    await payrollPage.expectPeriodRange(previousStart, previousEnd);
    await payrollPage.expectExports(previousStart);
    await expect(payrollPage.lastCompletedButton).toBeEnabled();

    await payrollPage.previousPeriod();
    await payrollPage.expectPeriodRange(
      addDays(previousStart, -7),
      addDays(previousEnd, -7),
    );

    await payrollPage.nextPeriod();
    await payrollPage.expectPeriodRange(previousStart, previousEnd);

    await payrollPage.nextPeriod();
    await payrollPage.expectPeriodRange(initial.start, initial.end);

    await payrollPage.nextPeriod();
    await payrollPage.expectPeriodRange(
      addDays(initial.start, 7),
      addDays(initial.end, 7),
    );
    await payrollPage.expectExports(addDays(initial.start, 7));
    await expect(payrollPage.lastCompletedButton).toBeEnabled();
    await payrollPage.expectEmptyOrResults();

    await payrollPage.goToLastCompletedPeriod();
    await payrollPage.expectPeriodRange(initial.start, initial.end);
    await expect(payrollPage.lastCompletedButton).toBeDisabled();
    await payrollPage.expectExports(initial.start);
    await payrollPage.expectPath(payrollPage.workspaceHref('/reports/payroll'));
    await payrollPage.expectNoBrokenValues();
  });

  test('parses same-year and cross-year period labels', () => {
    const sameYear = parsePayrollPeriod('Nov 2 – Nov 8, 2026');

    expect(formatIsoDate(sameYear.start)).toBe('2026-11-02');
    expect(formatIsoDate(sameYear.end)).toBe('2026-11-08');

    const crossYear = parsePayrollPeriod('Dec 28, 2026 – Jan 3, 2027');

    expect(formatIsoDate(crossYear.start)).toBe('2026-12-28');
    expect(formatIsoDate(crossYear.end)).toBe('2027-01-03');
    expect(() => parsePayrollPeriod('not a payroll period')).toThrow(
      /Unexpected payroll period label/,
    );
  });

  test('keeps week labels and export dates aligned across a year boundary', async ({
    payrollPage,
  }) => {
    await payrollPage.goto();

    let range = await payrollPage.periodRange();
    let crossed =
      range.start.getUTCFullYear() !== range.end.getUTCFullYear();

    for (let step = 0; step < 12 && !crossed; step += 1) {
      await payrollPage.nextPeriod();
      range = await payrollPage.periodRange();
      crossed = range.start.getUTCFullYear() !== range.end.getUTCFullYear();
    }

    test.skip(
      !crossed,
      'No year boundary falls within 12 weeks of the last completed period.',
    );

    expect(
      range.end.getUTCFullYear(),
      'A cross-year period should end in the following year',
    ).toBe(range.start.getUTCFullYear() + 1);
    expect(
      range.end.getTime() - range.start.getTime(),
      'A cross-year period should still span seven days',
    ).toBe(6 * DAY_MS);
    expect(range.start.getUTCDay(), 'Cross-year week starts Monday').toBe(1);

    await payrollPage.expectExports(range.start);
    await payrollPage.expectEmptyOrResults();
    await payrollPage.expectNoBrokenValues();
  });

  test('shows the unapproved-timesheets warning with its team link', async ({
    payrollPage,
  }) => {
    await payrollPage.goto();

    test.skip(
      !(await payrollPage.hasUnapprovedWarning()),
      'No unapproved timesheets in the last completed period.',
    );

    const range = await payrollPage.periodRange();

    await payrollPage.expectUnapprovedWarning();
    await payrollPage.expectReviewTimesheetsLink(range.start);
    await payrollPage.expectEmptyOrResults();
    await payrollPage.expectNoBrokenValues();
  });

  test('renders employee rows, totals and adjustment details when data exists', async ({
    payrollPage,
  }) => {
    await payrollPage.goto();

    test.skip(
      !(await payrollPage.hasResults()),
      'No approved timesheets in the last completed period.',
    );

    await payrollPage.expectResults();
    await payrollPage.expandFirstRow();
    await payrollPage.expectFirstRowDetails();
    await payrollPage.expectNoBrokenValues();
  });
});
