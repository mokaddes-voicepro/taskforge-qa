import { expect, type Locator, type Page } from '@playwright/test';
import { AppShellPage, type ShellPageOptions } from './AppShellPage';

/** Columns rendered by the payroll report when the period has approved hours. */
export const PAYROLL_TABLE_HEADERS = [
  'Employee',
  'Department',
  'Rate',
  'Regular h',
  'OT h',
  'DT h',
  'Leave h',
  'Unpaid break h',
  'Regular pay',
  'OT pay',
  'DT pay',
  'Leave pay',
  'Adjustments',
  'Est. gross',
] as const;

export interface PayrollPeriod {
  start: Date;
  end: Date;
  label: string;
}

const DAY_MS = 86_400_000;
const HOURS_PATTERN = /^\d+\.\d{2}$/;
const MONEY_PATTERN = /^[−+]?[$€£¥][\d,]+\.\d{2}$/;
const RATE_PATTERN = /^(?:No pay rate|[$€£¥][\d,]+\.\d{2}\/(?:h|yr))$/;
const SAME_YEAR_RANGE =
  /^([A-Z][a-z]{2}) (\d{1,2}) – ([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/;
const CROSS_YEAR_RANGE =
  /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}) – ([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/;
const MONTH_SHORT_INDEX: Readonly<Record<string, number>> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Today as a UTC date built from local calendar components. */
export function todayAsUtc(today: Date = new Date()): Date {
  return new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
}

/** Monday of the current local week, represented as a UTC calendar date. */
export function currentWeekStart(today: Date = new Date()): Date {
  const date = todayAsUtc(today);
  const offset = (date.getUTCDay() + 6) % 7;

  return addDays(date, -offset);
}

/** The weekly period that ended before the current week. */
export function lastCompletedPeriod(today: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const end = addDays(currentWeekStart(today), -1);

  return { start: addDays(end, -6), end };
}

/**
 * Parses the payroll period heading. Same-year periods omit the start year
 * (`Nov 2 – Nov 8, 2026`); a period that crosses a year boundary includes both
 * years (`Dec 28, 2026 – Jan 3, 2027`).
 */
export function parsePayrollPeriod(label: string): PayrollPeriod {
  const clean = normalize(label);
  const crossYear = clean.match(CROSS_YEAR_RANGE);

  if (crossYear) {
    const [
      ,
      startMonthName,
      startDayText,
      startYearText,
      endMonthName,
      endDayText,
      endYearText,
    ] = crossYear;
    const startMonth = MONTH_SHORT_INDEX[startMonthName];
    const endMonth = MONTH_SHORT_INDEX[endMonthName];

    if (startMonth === undefined || endMonth === undefined) {
      throw new Error(`Unexpected payroll month in range: "${label}"`);
    }

    return {
      start: new Date(
        Date.UTC(Number(startYearText), startMonth, Number(startDayText)),
      ),
      end: new Date(
        Date.UTC(Number(endYearText), endMonth, Number(endDayText)),
      ),
      label: clean,
    };
  }

  const sameYear = clean.match(SAME_YEAR_RANGE);

  if (!sameYear) {
    throw new Error(`Unexpected payroll period label: "${label}"`);
  }

  const [, startMonthName, startDayText, endMonthName, endDayText, yearText] =
    sameYear;
  const startMonth = MONTH_SHORT_INDEX[startMonthName];
  const endMonth = MONTH_SHORT_INDEX[endMonthName];

  if (startMonth === undefined || endMonth === undefined) {
    throw new Error(`Unexpected payroll month in range: "${label}"`);
  }

  const year = Number(yearText);

  return {
    start: new Date(Date.UTC(year, startMonth, Number(startDayText))),
    end: new Date(Date.UTC(year, endMonth, Number(endDayText))),
    label: clean,
  };
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Payroll report (Module 9). Read-only coverage for the last completed weekly
 * period, Previous/Next and Last completed period navigation, export links, the
 * unapproved-timesheets warning and its team-queue link, the empty state, and
 * the employee table when approved hours exist. Exporting is verified through
 * the CSV links only; no download is started and no payroll data is changed.
 */
export class PayrollPage extends AppShellPage {
  readonly heading: Locator;
  readonly description: Locator;
  readonly previousButton: Locator;
  readonly nextButton: Locator;
  readonly lastCompletedButton: Locator;
  readonly periodHeading: Locator;
  readonly exportDetailLink: Locator;
  readonly exportLink: Locator;
  readonly warningList: Locator;
  readonly warningItems: Locator;
  readonly reviewTimesheetsLink: Locator;
  readonly emptyStateTitle: Locator;
  readonly emptyStateDescription: Locator;
  readonly table: Locator;
  readonly note: Locator;

  constructor(page: Page, options: ShellPageOptions = {}) {
    super(page, options);
    this.heading = this.main.getByRole('heading', {
      name: 'Payroll',
      level: 1,
      exact: true,
    });
    this.description = this.main
      .getByText(
        'Approved hours and estimated gross wages for a pay period.',
        { exact: true },
      )
      .first();
    this.previousButton = this.main.getByRole('button', {
      name: 'Previous period',
      exact: true,
    });
    this.nextButton = this.main.getByRole('button', {
      name: 'Next period',
      exact: true,
    });
    this.lastCompletedButton = this.main.getByRole('button', {
      name: 'Last completed period',
      exact: true,
    });
    this.periodHeading = this.main.getByRole('heading', { level: 2 }).first();
    this.exportDetailLink = this.main.getByRole('link', {
      name: 'Export detail CSV',
      exact: true,
    });
    this.exportLink = this.main.getByRole('link', {
      name: 'Export CSV',
      exact: true,
    });
    this.warningList = this.main.locator('ul').filter({
      hasText:
        /excluded from this report|no employee ID|no pay rate|reopened after approval/,
    });
    this.warningItems = this.warningList.getByRole('listitem');
    this.reviewTimesheetsLink = this.warningList
      .getByRole('link', { name: 'Review timesheets', exact: true })
      .first();
    this.emptyStateTitle = this.main.getByText(
      'No approved timesheets in this period',
      { exact: true },
    );
    this.emptyStateDescription = this.main.getByText(
      'Approve timesheets for the period and they appear here with their estimated pay.',
      { exact: true },
    );
    this.table = this.main.getByRole('table');
    this.note = this.main
      .getByText(
        'Estimated gross wages. Taxes, deductions, filings and payments are handled by your payroll provider.',
        { exact: true },
      )
      .first();
  }

  async goto(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/reports/payroll'));
    await this.heading.waitFor({ state: 'visible', timeout: 30_000 });
    await this.previousButton.waitFor({ state: 'visible', timeout: 30_000 });
    await this.exportLink.waitFor({ state: 'visible', timeout: 30_000 });
    await this.waitForReport();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.description).toBeVisible();
    await expect(this.previousButton).toBeEnabled();
    await expect(this.nextButton).toBeEnabled();
    await expect(this.lastCompletedButton).toBeDisabled();
    await expect(this.exportDetailLink).toBeVisible();
    await expect(this.exportLink).toBeVisible();

    const expected = lastCompletedPeriod();

    await this.expectPeriodRange(expected.start, expected.end);
    await this.expectExports(expected.start);
    await this.expectNote();
    await this.expectEmptyOrResults();
    await this.expectNoBrokenValues();
  }

  async periodLabel(): Promise<string> {
    return normalize(await this.periodHeading.innerText());
  }

  async periodRange(): Promise<PayrollPeriod> {
    return parsePayrollPeriod(await this.periodLabel());
  }

  async expectPeriodRange(start: Date, end: Date): Promise<void> {
    await expect
      .poll(
        async () => {
          try {
            const range = await this.periodRange();

            return `${range.start.getTime()}:${range.end.getTime()}`;
          } catch {
            return '';
          }
        },
        {
          message: `Expected payroll period ${formatIsoDate(start)} to ${formatIsoDate(end)}`,
        },
      )
      .toBe(`${start.getTime()}:${end.getTime()}`);

    await this.waitForReport();
  }

  async previousPeriod(): Promise<void> {
    await this.shiftPeriod(-7);
  }

  async nextPeriod(): Promise<void> {
    await this.shiftPeriod(7);
  }

  async goToLastCompletedPeriod(): Promise<void> {
    await this.retryOnLoginRedirect(
      this.workspaceHref('/reports/payroll'),
      async () => {
        if (await this.lastCompletedButton.isDisabled()) {
          await this.expectLastCompletedPeriod();
          return;
        }

        await this.lastCompletedButton.click();
        await this.expectLastCompletedPeriod();
      },
    );
  }

  async expectLastCompletedPeriod(): Promise<void> {
    const expected = lastCompletedPeriod();

    await this.expectPeriodRange(expected.start, expected.end);
    await expect(this.lastCompletedButton).toBeDisabled();
  }

  async expectExports(day: Date): Promise<void> {
    const detail = await this.exportUrl(this.exportDetailLink);
    const summary = await this.exportUrl(this.exportLink);

    expect(detail.pathname, 'Payroll detail export path').toMatch(
      /\/reports\/payroll\/export-detail\.csv$/,
    );
    expect(summary.pathname, 'Payroll summary export path').toMatch(
      /\/reports\/payroll\/export\.csv$/,
    );
    expect(detail.searchParams.get('day'), 'Detail export day').toBe(
      formatIsoDate(day),
    );
    expect(summary.searchParams.get('day'), 'Summary export day').toBe(
      formatIsoDate(day),
    );
    await expect(this.exportDetailLink).toHaveAttribute('download', '');
    await expect(this.exportLink).toHaveAttribute('download', '');
  }

  async expectNote(): Promise<void> {
    await expect(this.note).toBeVisible();
    await expect(this.note).toHaveText(
      'Estimated gross wages. Taxes, deductions, filings and payments are handled by your payroll provider.',
    );
  }

  async hasUnapprovedWarning(): Promise<boolean> {
    return (
      (await this.warningItems
        .filter({ hasText: /excluded from this report/ })
        .count()) > 0
    );
  }

  async expectUnapprovedWarning(): Promise<void> {
    const warning = this.warningItems
      .filter({ hasText: /excluded from this report/ })
      .first();

    await expect(warning).toBeVisible();
    await expect(warning).toContainText(
      /\d+ timesheets? (?:isn't|aren't) approved/,
    );
    await expect(warning).toContainText('excluded from this report');
  }

  async expectReviewTimesheetsLink(day: Date): Promise<void> {
    await expect(this.reviewTimesheetsLink).toBeVisible();
    await expect(this.reviewTimesheetsLink).toHaveAttribute(
      'href',
      `${this.workspaceHref('/timesheets')}?tab=team&day=${formatIsoDate(day)}`,
    );
  }

  async expectEmptyOrResults(): Promise<void> {
    await this.waitForReport();

    if (await this.table.isVisible()) {
      await this.expectResults();
      return;
    }

    await this.expectEmptyState();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyStateTitle).toBeVisible();
    await expect(this.emptyStateDescription).toBeVisible();
    await expect(this.table).toHaveCount(0);
  }

  async hasResults(): Promise<boolean> {
    await this.waitForReport();

    return this.table.isVisible();
  }

  async expectResults(): Promise<void> {
    await expect(this.table).toBeVisible();
    await expect(this.table.locator('thead th')).toHaveText([
      ...PAYROLL_TABLE_HEADERS,
    ]);

    const rows = this.table.locator('tbody tr');
    const rowCount = await rows.count();

    expect(rowCount, 'Payroll employee rows').toBeGreaterThan(0);

    for (let index = 0; index < rowCount; index += 1) {
      const cells = (await rows.nth(index).locator('td').allInnerTexts()).map(
        normalize,
      );

      expect(cells, `Payroll row ${index + 1} columns`).toHaveLength(
        PAYROLL_TABLE_HEADERS.length,
      );
      expect(cells[0], `Payroll row ${index + 1} employee`).not.toBe('');
      expect(cells[1], `Payroll row ${index + 1} department`).not.toBe('');
      expect(cells[2], `Payroll row ${index + 1} rate`).toMatch(RATE_PATTERN);

      for (const column of [3, 4, 5, 6, 7]) {
        expect(
          cells[column],
          `Payroll row ${index + 1} hours (${PAYROLL_TABLE_HEADERS[column]})`,
        ).toMatch(HOURS_PATTERN);
      }

      for (const column of [8, 9, 10, 11, 12, 13]) {
        expect(
          cells[column],
          `Payroll row ${index + 1} pay (${PAYROLL_TABLE_HEADERS[column]})`,
        ).toMatch(MONEY_PATTERN);
      }
    }

    const totals = (
      await this.table.locator('tfoot tr').first().locator('td').allInnerTexts()
    ).map(normalize);

    expect(totals, 'Payroll footer columns').toHaveLength(12);
    expect(totals[0], 'Payroll footer employee count').toMatch(
      new RegExp(`^Total · ${rowCount} employees?$`),
    );

    for (const column of [1, 2, 3, 4, 5]) {
      expect(
        totals[column],
        `Payroll footer hours (${PAYROLL_TABLE_HEADERS[column + 2]})`,
      ).toMatch(HOURS_PATTERN);
    }

    for (const column of [6, 7, 8, 9, 10, 11]) {
      expect(
        totals[column],
        `Payroll footer pay (${PAYROLL_TABLE_HEADERS[column + 2]})`,
      ).toMatch(MONEY_PATTERN);
    }

    await this.expectNoBrokenValues();
  }

  async expandFirstRow(): Promise<void> {
    await this.table.locator('tbody tr').first().click();
    await expect(
      this.main
        .getByRole('button', { name: 'Adjustment', exact: true })
        .first(),
    ).toBeVisible();
  }

  async expectFirstRowDetails(): Promise<void> {
    if (
      await this.main
        .getByText('No adjustments for this period.', { exact: true })
        .isVisible()
    ) {
      return;
    }

    await expect(
      this.main
        .getByRole('button', { name: 'Edit adjustment', exact: true })
        .first(),
    ).toBeVisible();
    await expect(
      this.main
        .getByRole('button', { name: 'Delete adjustment', exact: true })
        .first(),
    ).toBeVisible();
  }

  async expectNoBrokenValues(): Promise<void> {
    await expect(this.main).not.toContainText(/NaN|undefined|Invalid Date/);
  }

  private async shiftPeriod(days: number): Promise<void> {
    await this.retryOnLoginRedirect(
      this.workspaceHref('/reports/payroll'),
      async () => {
        const current = await this.periodRange();
        const start = addDays(current.start, days);
        const end = addDays(current.end, days);
        const button = days < 0 ? this.previousButton : this.nextButton;

        await button.click();
        await this.expectPeriodRange(start, end);
      },
    );
  }

  private async exportUrl(link: Locator): Promise<URL> {
    const href = await link.getAttribute('href');

    if (!href) {
      throw new Error('Payroll export link has no href');
    }

    return new URL(href, this.page.url());
  }

  private async waitForReport(): Promise<void> {
    await expect
      .poll(
        async () =>
          (await this.table.isVisible()) ||
          (await this.emptyStateTitle.isVisible()),
        { message: 'Expected payroll results or an empty state' },
      )
      .toBe(true);

    await this.waitForSkeletonsToClear(this.main);
  }
}
