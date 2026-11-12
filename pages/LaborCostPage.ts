import { expect, type Locator, type Page } from '@playwright/test';
import { AppShellPage, type ShellPageOptions } from './AppShellPage';

export const LABOR_COST_RANGES = [
  'This week',
  'Last week',
  'This pay period',
  'Last pay period',
  'This month',
  'Custom',
] as const;

export type LaborCostRange = (typeof LABOR_COST_RANGES)[number];

export const LABOR_COST_GROUPS = [
  'Employee',
  'Project',
  'Department',
  'Office',
] as const;

export type LaborCostGroupBy = (typeof LABOR_COST_GROUPS)[number];

export const LABOR_COST_FILTERS = [
  'Department',
  'Office',
  'Project',
] as const;

export type LaborCostFilter = (typeof LABOR_COST_FILTERS)[number];

/** Export query values used by the report. */
export const LABOR_COST_GROUP_PARAMS: Readonly<
  Record<LaborCostGroupBy, string>
> = {
  Employee: 'EMPLOYEE',
  Project: 'JOB',
  Department: 'DEPARTMENT',
  Office: 'LOCATION',
} as const;

export const LABOR_COST_FILTER_PARAMS: Readonly<
  Record<LaborCostFilter, string>
> = {
  Department: 'teamIds',
  Office: 'locationIds',
  Project: 'projectIds',
} as const;

export interface LaborCostRangeDates {
  start: Date;
  end: Date;
  label: string;
}

export interface LaborCostRow {
  label: string;
  regular: string;
  overtime: string;
  doubleTime: string;
  total: string;
  cost: string;
  budget: string;
  variance: string;
  used: string;
}

export interface LaborCostExportExpectation {
  start?: Date;
  end?: Date;
  group?: LaborCostGroupBy;
  approvedOnly?: boolean;
}

export type LaborCostDateField = 'from' | 'to';

const DAY_MS = 86_400_000;
const RANGE_LABEL = /^[A-Z][a-z]{2} \d{1,2} – [A-Z][a-z]{2} \d{1,2}, \d{4}$/;
const LONG_MONTH_LABEL = /^[A-Z][a-z]+ \d{4}$/;
const HOURS_PATTERN = /^\d+\.\d{2}$/;
const COST_PATTERN = /^(?:\$\d[\d,]*(?:\.\d{2})?|No pay rate)$/;
const BUDGET_PATTERN = /^(?:—|\$\d[\d,]*(?:\.\d{2})?)$/;
const VARIANCE_PATTERN = /^(?:—|[+\-]?\$?\d[\d,]*(?:\.\d{2})?)$/;
const USED_PATTERN = /^(?:No budget|\d+(?:\.\d+)?%)$/;
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
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

const TABLE_HEADERS: Readonly<
  Record<LaborCostGroupBy, readonly string[]>
> = {
  Employee: [
    'Employee',
    'Regular h',
    'OT h',
    'DT h',
    'Total h',
    'Est. cost',
  ],
  Project: [
    'Project',
    'Regular h',
    'OT h',
    'DT h',
    'Total h',
    'Est. cost',
    'Budget',
    'Variance',
    'Used',
  ],
  Department: [
    'Department',
    'Regular h',
    'OT h',
    'DT h',
    'Total h',
    'Est. cost',
  ],
  Office: [
    'Office',
    'Regular h',
    'OT h',
    'DT h',
    'Total h',
    'Est. cost',
    'Budget',
    'Variance',
    'Used',
  ],
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

export function currentMonthRange(today: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const year = today.getFullYear();
  const month = today.getMonth();

  return {
    start: new Date(Date.UTC(year, month, 1)),
    end: new Date(Date.UTC(year, month + 1, 0)),
  };
}

/** A day in the current local month, represented as a UTC calendar date. */
export function currentMonthDay(day: number, today: Date = new Date()): Date {
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), day));
}

/** Parses a report range label, e.g. `Nov 2 – Nov 8, 2026`. */
export function parseLaborCostRange(label: string): LaborCostRangeDates {
  const match = normalize(label).match(
    /^([A-Z][a-z]{2}) (\d{1,2}) – ([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/,
  );

  if (!match) {
    throw new Error(`Unexpected labor cost range label: "${label}"`);
  }

  const [, startMonthName, startDay, endMonthName, endDay, endYearText] =
    match;
  const startMonth = MONTH_SHORT_INDEX[startMonthName];
  const endMonth = MONTH_SHORT_INDEX[endMonthName];
  const endYear = Number(endYearText);

  if (startMonth === undefined || endMonth === undefined) {
    throw new Error(`Unexpected labor cost month in range: "${label}"`);
  }

  // A range can cross a year boundary (e.g. Dec 28 – Jan 3, 2027).
  const startYear = startMonth > endMonth ? endYear - 1 : endYear;

  return {
    start: new Date(Date.UTC(startYear, startMonth, Number(startDay))),
    end: new Date(Date.UTC(endYear, endMonth, Number(endDay))),
    label,
  };
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateLabel(date: Date): string {
  return `${MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function formatPickerDay(date: Date): string {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

function formatPickerMonth(date: Date): string {
  return `${MONTHS_LONG[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function parsePickerMonth(label: string): { year: number; month: number } {
  const match = normalize(label).match(/^([A-Z][a-z]+) (\d{4})$/);

  if (!match) {
    throw new Error(`Unexpected labor cost picker month: "${label}"`);
  }

  const month = MONTHS_LONG.indexOf(
    match[1] as (typeof MONTHS_LONG)[number],
  );

  if (month === -1) {
    throw new Error(`Unexpected labor cost picker month name: "${match[1]}"`);
  }

  return { year: Number(match[2]), month };
}

function costToNumber(value: string): number {
  if (value === 'No pay rate' || value === '—') {
    return 0;
  }

  return Number(value.replace(/[$,]/g, ''));
}

function readRow(row: Element): LaborCostRow {
  const cells = Array.from(row.querySelectorAll('td,th')).map((cell) =>
    (cell.textContent ?? '').replace(/\s+/g, ' ').trim(),
  );

  return {
    label: cells[0] ?? '',
    regular: cells[1] ?? '',
    overtime: cells[2] ?? '',
    doubleTime: cells[3] ?? '',
    total: cells[4] ?? '',
    cost: cells[5] ?? '',
    budget: cells[6] ?? '',
    variance: cells[7] ?? '',
    used: cells[8] ?? '',
  };
}

/**
 * Labor cost report (Module 8). Read-only coverage for the date-range presets,
 * custom range pickers, grouping dimensions, department/office/project filters,
 * Approved-only toggle, export query and the result table. Exporting is verified
 * by inspecting the CSV link only; no download or mutation is triggered.
 */
export class LaborCostPage extends AppShellPage {
  readonly heading: Locator;
  readonly description: Locator;
  readonly exportLink: Locator;
  readonly dateRangeSelect: Locator;
  readonly rangeSummary: Locator;
  readonly groupBySelect: Locator;
  readonly approvedOnlySwitch: Locator;
  readonly filterDialog: Locator;
  readonly emptyStateMessage: Locator;
  readonly emptyStateDescription: Locator;
  readonly table: Locator;
  readonly noPayRateNotice: Locator;
  readonly footnote: Locator;
  readonly customPrompt: Locator;
  readonly fromButton: Locator;
  readonly toButton: Locator;

  constructor(page: Page, options: ShellPageOptions = {}) {
    super(page, options);
    this.heading = this.main.getByRole('heading', {
      name: 'Labor cost',
      level: 1,
      exact: true,
    });
    this.description = this.main
      .getByText(
        'Estimated cost of the hours worked, from pay rates and your overtime rules.',
        { exact: true },
      )
      .first();
    this.exportLink = this.main.getByRole('link', {
      name: 'Export CSV',
      exact: true,
    });
    this.dateRangeSelect = this.main.locator('#lc-range');
    this.rangeSummary = this.main.getByText(RANGE_LABEL).first();
    this.groupBySelect = this.main.locator('#lc-group');
    this.approvedOnlySwitch = this.main.getByRole('switch', {
      name: 'Approved only',
      exact: true,
    });
    this.filterDialog = page.getByRole('dialog').last();
    this.emptyStateMessage = this.main.getByText('No hours in this range', {
      exact: true,
    });
    this.emptyStateDescription = this.main.getByText(
      'Hours appear here once people clock in during the range.',
      { exact: true },
    );
    this.table = this.main.getByRole('table');
    this.noPayRateNotice = this.main.getByText(
      /\d+ employees? (?:has|have) hours but no pay rate\./,
    );
    this.footnote = this.main
      .getByText(/^Estimated\. Open entries count up to now/)
      .first();
    this.customPrompt = this.main.getByText('Pick the first and last day.', {
      exact: true,
    });
    this.fromButton = this.main.getByRole('button', {
      name: 'From',
      exact: true,
    });
    this.toButton = this.main.getByRole('button', {
      name: 'To',
      exact: true,
    });
  }

  async goto(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/reports/labor-cost'));
    await this.heading.waitFor({ state: 'visible', timeout: 30_000 });
    await this.exportLink.waitFor({ state: 'visible', timeout: 30_000 });
    await this.dateRangeSelect.waitFor({ state: 'visible', timeout: 30_000 });
    await this.waitForReport();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.description).toBeVisible();
    await expect(this.exportLink).toBeVisible();
    await expect(this.dateRangeSelect).toBeVisible();
    await expect(this.dateRangeSelect).toHaveText('This week');
    await expect(this.rangeSummary).toBeVisible();
    await expect(this.rangeSummary).toHaveText(RANGE_LABEL);
    await expect(this.groupBySelect).toHaveText('Employee');
    await expect(this.approvedOnlySwitch).toBeVisible();
    await expect(this.approvedOnlySwitch).toHaveAttribute(
      'aria-checked',
      'false',
    );

    for (const filter of LABOR_COST_FILTERS) {
      await expect(this.filterButton(filter), `${filter} filter`).toBeVisible();
      await this.expectFilterCount(filter, 0);
    }

    await expect(this.footnote).toBeVisible();
    await this.expectEmptyOrResults();
    await this.expectNoBrokenValues();
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
    await expect(this.emptyStateMessage).toBeVisible();
    await expect(this.emptyStateDescription).toBeVisible();
    await expect(this.table).toHaveCount(0);
  }

  async range(): Promise<LaborCostRange> {
    return normalize(await this.dateRangeSelect.innerText()) as LaborCostRange;
  }

  async expectRange(range: LaborCostRange): Promise<void> {
    await expect(this.dateRangeSelect).toHaveText(range);
  }

  async rangeDates(): Promise<LaborCostRangeDates> {
    return parseLaborCostRange(normalize(await this.rangeSummary.innerText()));
  }

  async expectRangeDates(start: Date, end: Date): Promise<void> {
    const range = await this.rangeDates();

    expect(range.start.getTime(), 'Labor cost range start').toBe(
      start.getTime(),
    );
    expect(range.end.getTime(), 'Labor cost range end').toBe(end.getTime());
  }

  async expectRangeOptions(): Promise<void> {
    await this.dateRangeSelect.click();

    const listbox = this.page.getByRole('listbox').last();

    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole('option')).toHaveCount(
      LABOR_COST_RANGES.length,
    );

    const options = (await listbox.getByRole('option').allInnerTexts()).map(
      normalize,
    );

    expect(options, 'Labor cost date-range options').toEqual([
      ...LABOR_COST_RANGES,
    ]);

    await this.page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
  }

  async selectRange(range: LaborCostRange): Promise<void> {
    if ((await this.range()) === range) {
      await this.expectRange(range);
      return;
    }

    await this.selectFromList(this.dateRangeSelect, range);
    await this.expectRange(range);
    await this.waitForSkeletonsToClear();

    if (range === 'Custom') {
      await expect(this.customPrompt).toBeVisible();
      return;
    }

    await expect(this.rangeSummary).toHaveText(RANGE_LABEL);
  }

  async groupBy(): Promise<LaborCostGroupBy> {
    return normalize(await this.groupBySelect.innerText()) as LaborCostGroupBy;
  }

  async expectGroup(group: LaborCostGroupBy): Promise<void> {
    await expect(this.groupBySelect).toHaveText(group);
  }

  async expectGroupOptions(): Promise<void> {
    await this.groupBySelect.click();

    const listbox = this.page.getByRole('listbox').last();

    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole('option')).toHaveCount(
      LABOR_COST_GROUPS.length,
    );

    const options = (await listbox.getByRole('option').allInnerTexts()).map(
      normalize,
    );

    expect(options, 'Labor cost grouping options').toEqual([
      ...LABOR_COST_GROUPS,
    ]);

    await this.page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
  }

  async selectGroup(group: LaborCostGroupBy): Promise<void> {
    if ((await this.groupBy()) === group) {
      await this.expectGroup(group);
      return;
    }

    await this.selectFromList(this.groupBySelect, group);
    await this.expectGroup(group);
    await this.expectGroupResultsLoaded(group);
  }

  async expectResults(group?: LaborCostGroupBy): Promise<void> {
    const expectedGroup = group ?? (await this.groupBy());

    await expect(this.table).toBeVisible();
    await expect(
      this.table.locator('thead th'),
      `${expectedGroup} table headers`,
    ).toHaveText([...TABLE_HEADERS[expectedGroup]]);

    const rows = await this.rows();

    expect(rows.length, 'Labor cost rows').toBeGreaterThan(0);

    for (const row of rows) {
      this.expectRow(row);
    }

    const totals = await this.totals();

    this.expectRow(totals, 'Total row');
    this.expectTotals(rows, totals);

    if (rows.some((row) => row.cost === 'No pay rate')) {
      await expect(this.noPayRateNotice).toBeVisible();
    }

    await this.expectNoBrokenValues();
  }

  async firstRowLabel(): Promise<string> {
    const row = this.table.locator('tbody tr').first();

    if ((await row.count()) === 0) {
      return '';
    }

    return normalize(await row.locator('td').first().innerText());
  }

  async exportUrl(): Promise<URL> {
    const href = await this.exportLink.getAttribute('href');

    if (!href) {
      throw new Error('Labor cost export link has no href');
    }

    return new URL(href, this.page.url());
  }

  async exportParams(): Promise<URLSearchParams> {
    return (await this.exportUrl()).searchParams;
  }

  async expectExport(
    expectation: LaborCostExportExpectation = {},
  ): Promise<void> {
    const params = await this.exportParams();

    if (expectation.start) {
      expect(params.get('from'), 'Export start date').toBe(
        formatIsoDate(expectation.start),
      );
    }

    if (expectation.end) {
      expect(params.get('to'), 'Export end date').toBe(
        formatIsoDate(expectation.end),
      );
    }

    if (expectation.group) {
      expect(params.get('groupBy'), 'Export grouping').toBe(
        LABOR_COST_GROUP_PARAMS[expectation.group],
      );
    }

    if (expectation.approvedOnly === true) {
      expect(params.get('approvedOnly'), 'Export approved-only flag').toBe(
        'true',
      );
    }

    if (expectation.approvedOnly === false) {
      expect(
        params.get('approvedOnly'),
        'Export should omit the approved-only flag',
      ).toBeNull();
    }
  }

  async expectExportAvailable(): Promise<void> {
    await expect(this.exportLink).toBeVisible();
  }

  async expectExportUnavailable(): Promise<void> {
    await expect(this.exportLink).toBeHidden();
  }

  async approvedOnly(): Promise<boolean> {
    return (
      (await this.approvedOnlySwitch.getAttribute('aria-checked')) === 'true'
    );
  }

  async expectApprovedOnly(value: boolean): Promise<void> {
    await expect(this.approvedOnlySwitch).toHaveAttribute(
      'aria-checked',
      String(value),
    );
  }

  async toggleApprovedOnly(): Promise<void> {
    const before = await this.approvedOnly();

    await this.approvedOnlySwitch.click();
    await expect
      .poll(() => this.approvedOnly(), {
        message: 'Expected Approved only to toggle',
      })
      .toBe(!before);
  }

  filterButton(filter: LaborCostFilter): Locator {
    return this.main
      .getByRole('button', {
        name: new RegExp(`^${filter}(?: \\d+)?$`),
      })
      .first();
  }

  async filterCount(filter: LaborCostFilter): Promise<number> {
    const text = normalize(
      (await this.filterButton(filter).textContent()) ?? '',
    );
    const match = text.replace(/\s+/g, '').match(/(\d+)$/);

    return match ? Number(match[1]) : 0;
  }

  async expectFilterCount(
    filter: LaborCostFilter,
    count: number,
  ): Promise<void> {
    await expect
      .poll(() => this.filterCount(filter), {
        message: `Expected the ${filter} filter to show ${count} active value(s)`,
      })
      .toBe(count);
  }

  async openFilter(filter: LaborCostFilter): Promise<void> {
    await this.filterButton(filter).click();
    await expect(this.filterDialog).toBeVisible();
  }

  async closeFilter(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.filterDialog).toBeHidden();
  }

  async expectFilterOptionSets(): Promise<void> {
    for (const filter of LABOR_COST_FILTERS) {
      await this.openFilter(filter);

      await expect(
        this.filterDialog.locator('input').first(),
        `${filter} search input`,
      ).toHaveAttribute('placeholder', /^Search /);

      const options = this.filterDialog.getByRole('option');

      if ((await options.count()) > 0) {
        const labels = (await options.allInnerTexts()).map(normalize);

        for (const label of labels) {
          expect(label, `${filter} option`).not.toBe('');
        }
      } else {
        await expect(
          this.filterDialog.getByText('Nothing found.', { exact: true }),
          `${filter} empty state`,
        ).toBeVisible();
      }

      await this.closeFilter();
    }
  }

  async selectFirstFilterOption(filter: LaborCostFilter): Promise<void> {
    await this.openFilter(filter);

    const option = this.filterDialog.getByRole('option').first();

    await expect(option, `${filter} filter option`).toBeVisible();

    await option.click();
    await this.expectFilterCount(filter, 1);
    await this.closeFilter();
    await this.waitForSkeletonsToClear();
  }

  async deselectFirstFilterOption(filter: LaborCostFilter): Promise<void> {
    await this.openFilter(filter);

    const option = this.filterDialog.getByRole('option').first();

    await expect(option, `${filter} filter option`).toBeVisible();

    await option.click();
    await this.expectFilterCount(filter, 0);
    await this.closeFilter();
    await this.waitForSkeletonsToClear();
  }

  async expectFilterInExport(
    filter: LaborCostFilter,
    applied: boolean,
  ): Promise<void> {
    const params = await this.exportParams();
    const value = params.get(LABOR_COST_FILTER_PARAMS[filter]);

    if (applied) {
      expect(value, `${filter} export filter`).toMatch(/^[\w,-]+$/);
      return;
    }

    expect(value, `${filter} export filter should be cleared`).toBeNull();
  }

  async pickCustomDate(
    field: LaborCostDateField,
    date: Date,
  ): Promise<void> {
    const trigger = field === 'from' ? this.fromButton : this.toButton;

    await trigger.click();

    const popover = this.page
      .locator('[data-slot="popover-content"]')
      .last();

    await expect(popover).toBeVisible();
    await expect(popover.getByRole('status')).toHaveText(LONG_MONTH_LABEL);

    await this.choosePickerDay(trigger, popover, date);
  }

  async expectCustomDate(
    field: LaborCostDateField,
    date: Date,
  ): Promise<void> {
    const trigger = field === 'from' ? this.fromButton : this.toButton;

    await expect(trigger).toHaveText(formatDateLabel(date));
  }

  async expectCustomPending(): Promise<void> {
    await expect(this.fromButton).toBeVisible();
    await expect(this.toButton).toBeVisible();
    await expect(this.customPrompt).toBeVisible();
  }

  /**
   * Selects a preset range that actually has hours. Returns false when every
   * candidate is empty so callers can skip data-dependent assertions.
   */
  async ensureRangeWithData(): Promise<boolean> {
    if (await this.table.isVisible()) {
      return true;
    }

    for (const range of [
      'Last week',
      'Last pay period',
      'This month',
    ] as const) {
      await this.selectRange(range);

      const visible = await this.table
        .waitFor({ state: 'visible', timeout: 8_000 })
        .then(() => true)
        .catch(() => false);

      if (visible) {
        return true;
      }
    }

    return false;
  }

  async expectNoBrokenValues(): Promise<void> {
    await expect(this.main).not.toContainText(
      /NaN|undefined|Invalid Date/,
    );
  }

  private async rows(): Promise<LaborCostRow[]> {
    return this.table.locator('tbody tr').evaluateAll((rows) =>
      rows.map((row) => {
        const cells = Array.from(row.querySelectorAll('td,th')).map((cell) =>
          (cell.textContent ?? '').replace(/\s+/g, ' ').trim(),
        );

        return {
          label: cells[0] ?? '',
          regular: cells[1] ?? '',
          overtime: cells[2] ?? '',
          doubleTime: cells[3] ?? '',
          total: cells[4] ?? '',
          cost: cells[5] ?? '',
          budget: cells[6] ?? '',
          variance: cells[7] ?? '',
          used: cells[8] ?? '',
        };
      }),
    );
  }

  private async totals(): Promise<LaborCostRow> {
    return this.table.locator('tfoot tr').first().evaluate((row) => {
      const cells = Array.from(row.querySelectorAll('td,th')).map((cell) =>
        (cell.textContent ?? '').replace(/\s+/g, ' ').trim(),
      );

      return {
        label: cells[0] ?? '',
        regular: cells[1] ?? '',
        overtime: cells[2] ?? '',
        doubleTime: cells[3] ?? '',
        total: cells[4] ?? '',
        cost: cells[5] ?? '',
        budget: cells[6] ?? '',
        variance: cells[7] ?? '',
        used: cells[8] ?? '',
      };
    });
  }

  private expectRow(row: LaborCostRow, label = `Row "${row.label}"`): void {
    expect(row.label, `${label} label`).not.toBe('');
    expect(row.regular, `${label} regular hours`).toMatch(HOURS_PATTERN);
    expect(row.overtime, `${label} overtime hours`).toMatch(HOURS_PATTERN);
    expect(row.doubleTime, `${label} double-time hours`).toMatch(
      HOURS_PATTERN,
    );
    expect(row.total, `${label} total hours`).toMatch(HOURS_PATTERN);
    expect(row.cost, `${label} estimated cost`).toMatch(COST_PATTERN);

    if (row.budget) {
      expect(row.budget, `${label} budget`).toMatch(BUDGET_PATTERN);
    }

    if (row.variance) {
      expect(row.variance, `${label} budget variance`).toMatch(
        VARIANCE_PATTERN,
      );
    }

    if (row.used) {
      expect(row.used, `${label} budget used`).toMatch(USED_PATTERN);
    }

    const regular = Number(row.regular);
    const overtime = Number(row.overtime);
    const doubleTime = Number(row.doubleTime);
    const total = Number(row.total);

    expect(
      Math.abs(regular + overtime + doubleTime - total),
      `${label} hours should add up`,
    ).toBeLessThan(0.011);
  }

  private expectTotals(rows: LaborCostRow[], totals: LaborCostRow): void {
    expect(totals.label, 'Labor cost total label').toBe('Total');

    for (const field of [
      'regular',
      'overtime',
      'doubleTime',
      'total',
    ] as const) {
      const sum = rows.reduce((value, row) => value + Number(row[field]), 0);

      expect(
        Math.abs(sum - Number(totals[field])),
        `Footer ${field} hours should match the row sum`,
      ).toBeLessThan(0.011);
    }

    const rowCost = rows.reduce(
      (value, row) =>
        value +
        (row.cost === 'No pay rate' ? 0 : costToNumber(row.cost)),
      0,
    );

    expect(
      Math.abs(rowCost - costToNumber(totals.cost)),
      'Footer cost should match the paid-row estimate',
    ).toBeLessThan(0.011);
  }

  private async expectGroupResultsLoaded(
    group: LaborCostGroupBy,
  ): Promise<void> {
    await expect
      .poll(
        async () => {
          if (await this.table.isVisible()) {
            return normalize(
              await this.table.locator('thead th').first().innerText(),
            );
          }

          if (await this.emptyStateMessage.isVisible()) {
            return 'empty';
          }

          return '';
        },
        {
          message: `Expected grouped labor cost results for ${group}`,
        },
      )
      .toMatch(new RegExp(`^(?:${group}|empty)$`));

    await this.waitForSkeletonsToClear();
  }

  private async waitForReport(): Promise<void> {
    await expect
      .poll(
        async () =>
          (await this.table.isVisible()) ||
          (await this.emptyStateMessage.isVisible()) ||
          (await this.customPrompt.isVisible()),
        {
          message: 'Expected labor cost results or an empty state',
        },
      )
      .toBe(true);

    await this.waitForSkeletonsToClear();
  }

  private async selectFromList(
    trigger: Locator,
    optionName: string,
  ): Promise<void> {
    await trigger.click();

    const listbox = this.page.getByRole('listbox').last();

    await expect(listbox).toBeVisible();

    await listbox
      .getByRole('option', { name: optionName, exact: true })
      .click();
    await expect(listbox).toBeHidden();
  }

  private async choosePickerDay(
    trigger: Locator,
    popover: Locator,
    date: Date,
  ): Promise<void> {
    const caption = popover.getByRole('status');
    const targetMonth = formatPickerMonth(date);

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const current = normalize(await caption.innerText());

      if (current === targetMonth) {
        break;
      }

      const currentDate = parsePickerMonth(current);
      const offset =
        date.getUTCFullYear() * 12 +
        date.getUTCMonth() -
        (currentDate.year * 12 + currentDate.month);
      const direction = offset > 0 ? 'Next' : 'Previous';

      await popover
        .getByRole('button', { name: `Go to the ${direction} Month` })
        .click();
      await expect
        .poll(() => caption.innerText().then(normalize), {
          message: `Expected the labor cost picker to leave ${current}`,
        })
        .not.toBe(current);
    }

    await expect(caption).toHaveText(targetMonth);

    const day = popover.locator(
      `button[data-day="${formatPickerDay(date)}"]`,
    );

    await expect(day).toBeVisible();
    await day.click();
    await expect(popover).toBeHidden();
    await expect(trigger).toHaveText(formatDateLabel(date));
  }
}
