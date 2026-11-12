import { expect, type Locator, type Page } from '@playwright/test';
import { AppShellPage, type ShellPageOptions } from './AppShellPage';

export type TimesheetTabKey = 'mine' | 'team';

export interface TimesheetTabDefinition {
  label: string;
  query: string;
}

/** Tabs on the Timesheets module and the URL query each one uses. */
export const TIMESHEET_TABS: Readonly<
  Record<TimesheetTabKey, TimesheetTabDefinition>
> = {
  mine: { label: 'My timesheet', query: '' },
  team: { label: 'Team', query: '?tab=team' },
} as const;

export const TIMESHEET_TAB_KEYS: readonly TimesheetTabKey[] = [
  'mine',
  'team',
] as const;

export interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
}

export interface TeamRow {
  employee: string;
  status: string;
  hours: string;
  overtime: string;
  flags: string;
  pay: string;
}

const DAY_MS = 86_400_000;
const PERIOD_LABEL = /^[A-Z][a-z]{2} \d{1,2} – [A-Z][a-z]{2} \d{1,2}, \d{4}$/;
const DURATION_PATTERN = /^(?:\d+h(?:\s*\d+m)?|\d+m)$/;
const PAY_PATTERN = /^\$\d[\d,]*(?:\.\d{1,2})?$/;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = [
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
const MONTHS: Readonly<Record<string, number>> = {
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

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Parses a weekly pay-period heading, e.g. `Nov 9 – Nov 15, 2026`. */
export function parsePeriodLabel(label: string): PeriodRange {
  const match = label.match(
    /^([A-Z][a-z]{2}) (\d{1,2}) – ([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/,
  );

  if (!match) {
    throw new Error(`Unexpected timesheet period label: "${label}"`);
  }

  const [, startMonthName, startDay, endMonthName, endDay, endYearText] =
    match;
  const startMonth = MONTHS[startMonthName];
  const endMonth = MONTHS[endMonthName];
  const endYear = Number(endYearText);

  if (startMonth === undefined || endMonth === undefined) {
    throw new Error(`Unexpected timesheet month in period label: "${label}"`);
  }

  // A pay period can cross a year boundary (e.g. Dec 28 – Jan 3, 2027).
  const startYear = startMonth > endMonth ? endYear - 1 : endYear;

  return {
    start: new Date(Date.UTC(startYear, startMonth, Number(startDay))),
    end: new Date(Date.UTC(endYear, endMonth, Number(endDay))),
    label,
  };
}

/**
 * Timesheets module (Module 6). Read-only coverage for the weekly period,
 * summary cards, daily rows, My timesheet/Team tabs, team approval gating and
 * the Add entry dialog. Submitting, approving and saving manual entries are
 * intentionally not exercised because they mutate the shared workspace.
 */
export class TimesheetsPage extends AppShellPage {
  readonly heading: Locator;
  readonly description: Locator;
  readonly periodHeading: Locator;
  readonly previousPeriodButton: Locator;
  readonly nextPeriodButton: Locator;
  readonly thisPeriodButton: Locator;
  readonly tabList: Locator;
  readonly activePanel: Locator;
  readonly statusBadge: Locator;
  readonly addEntryButton: Locator;
  readonly submitButton: Locator;
  readonly approveButton: Locator;
  readonly addEntryDialog: Locator;
  readonly dialogClockIn: Locator;
  readonly dialogClockOut: Locator;
  readonly dialogProject: Locator;
  readonly dialogOffice: Locator;
  readonly dialogNote: Locator;
  readonly dialogReason: Locator;
  readonly dialogAddBreakButton: Locator;
  readonly dialogBreakTypeButton: Locator;
  readonly dialogBreakStart: Locator;
  readonly dialogBreakEnd: Locator;
  readonly dialogRemoveBreakButton: Locator;
  readonly dialogCancelButton: Locator;
  readonly dialogAddEntryButton: Locator;
  readonly clockOrderError: Locator;

  constructor(page: Page, options: ShellPageOptions = {}) {
    super(page, options);
    this.heading = this.main.getByRole('heading', {
      name: 'Timesheets',
      level: 1,
      exact: true,
    });
    this.description = this.main
      .getByText('Hours, overtime and approvals for each pay period.', {
        exact: true,
      })
      .first();
    this.periodHeading = this.main
      .getByRole('heading', { level: 2 })
      .filter({ hasText: PERIOD_LABEL })
      .first();
    this.previousPeriodButton = this.main.getByRole('button', {
      name: 'Previous period',
      exact: true,
    });
    this.nextPeriodButton = this.main.getByRole('button', {
      name: 'Next period',
      exact: true,
    });
    this.thisPeriodButton = this.main.getByRole('button', {
      name: 'This period',
      exact: true,
    });
    this.tabList = page.getByRole('tablist').first();
    this.activePanel = page.locator('[role="tabpanel"]:not([hidden])').first();
    this.statusBadge = this.activePanel.locator('[data-slot="badge"]').first();
    this.addEntryButton = this.activePanel.getByRole('button', {
      name: 'Add entry',
      exact: true,
    });
    this.submitButton = this.activePanel.getByRole('button', {
      name: 'Submit',
      exact: true,
    });
    this.approveButton = this.activePanel.getByRole('button', {
      name: /^Approve selected(?: \(\d+\))?$/,
    });

    this.addEntryDialog = page.locator('[data-slot="dialog-content"]').last();
    this.dialogClockIn = this.addEntryDialog.locator('#entry-in');
    this.dialogClockOut = this.addEntryDialog.locator('#entry-out');
    this.dialogProject = this.addEntryDialog.locator('#entry-project');
    this.dialogOffice = this.addEntryDialog.locator('#entry-location');
    this.dialogNote = this.addEntryDialog.locator('#entry-note');
    this.dialogReason = this.addEntryDialog.locator('#entry-reason');
    this.dialogAddBreakButton = this.addEntryDialog.getByRole('button', {
      name: 'Add break',
      exact: true,
    });
    this.dialogBreakTypeButton = this.addEntryDialog.getByRole('combobox', {
      name: 'Break type',
      exact: true,
    });
    this.dialogBreakStart = this.addEntryDialog.getByLabel('Break start', {
      exact: true,
    });
    this.dialogBreakEnd = this.addEntryDialog.getByLabel('Break end', {
      exact: true,
    });
    this.dialogRemoveBreakButton = this.addEntryDialog.getByRole('button', {
      name: 'Remove break',
      exact: true,
    });
    this.dialogCancelButton = this.addEntryDialog.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });
    this.dialogAddEntryButton = this.addEntryDialog.getByRole('button', {
      name: 'Add entry',
      exact: true,
    });
    this.clockOrderError = this.addEntryDialog.getByText(
      'Clock-out must be after clock-in.',
      { exact: true },
    );
  }

  async goto(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/timesheets'));
    await this.heading.waitFor({ state: 'visible', timeout: 30_000 });
    await this.periodHeading.waitFor({ state: 'visible', timeout: 30_000 });
    await this.activePanel.waitFor({ state: 'visible', timeout: 30_000 });
    await this.waitForTimesheet();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.description).toBeVisible();
    await expect(this.periodHeading).toBeVisible();
    await expect(this.periodHeading).toHaveText(PERIOD_LABEL);
    await expect(this.previousPeriodButton).toBeVisible();
    await expect(this.nextPeriodButton).toBeVisible();
    await expect(this.thisPeriodButton).toBeVisible();
    await expect(this.thisPeriodButton).toBeDisabled();

    await expect(this.tabList).toBeVisible();
    await this.expectTab('mine');
    await expect(this.statusBadge).toBeVisible();
    await expect(this.statusBadge).toHaveText(/\S+/);
    await expect(this.addEntryButton).toBeVisible();
    await expect(this.submitButton).toBeVisible();

    await this.expectSummary();
    await this.expectDailyRows();
    await this.expectNoBrokenValues();
  }

  async periodLabel(): Promise<string> {
    return ((await this.periodHeading.textContent()) ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async periodRange(): Promise<PeriodRange> {
    return parsePeriodLabel(await this.periodLabel());
  }

  async expectPeriodStarts(expectedStart: Date): Promise<void> {
    const range = await this.periodRange();

    expect(range.start.getTime(), 'Pay period start').toBe(
      expectedStart.getTime(),
    );
    expect(range.end.getTime(), 'Pay period end').toBe(
      addDays(expectedStart, 6).getTime(),
    );
  }

  async nextPeriod(): Promise<void> {
    const before = await this.periodLabel();

    await this.nextPeriodButton.click();
    await expect
      .poll(() => this.periodLabel(), {
        message: 'Expected Next period to advance the pay period',
      })
      .not.toBe(before);
    await this.waitForTimesheet();
  }

  async previousPeriod(): Promise<void> {
    const before = await this.periodLabel();

    await this.previousPeriodButton.click();
    await expect
      .poll(() => this.periodLabel(), {
        message: 'Expected Previous period to move the pay period back',
      })
      .not.toBe(before);
    await this.waitForTimesheet();
  }

  async goToThisPeriod(expectedLabel?: string): Promise<void> {
    await this.thisPeriodButton.click();

    if (expectedLabel) {
      await expect
        .poll(() => this.periodLabel(), {
          message: `Expected This period to return to "${expectedLabel}"`,
        })
        .toBe(expectedLabel);
    }

    await expect(this.thisPeriodButton).toBeDisabled();
    await this.waitForTimesheet();
  }

  tab(key: TimesheetTabKey): Locator {
    return this.tabList.getByRole('tab', {
      name: TIMESHEET_TABS[key].label,
      exact: true,
    });
  }

  async selectTab(key: TimesheetTabKey): Promise<void> {
    await this.tab(key).click();
    await this.expectTab(key);
    await expect
      .poll(() => new URL(this.page.url()).search, {
        message: `Expected the ${TIMESHEET_TABS[key].label} tab to sync the URL`,
      })
      .toBe(TIMESHEET_TABS[key].query);
    await this.waitForActivePanel();
  }

  async expectTab(key: TimesheetTabKey): Promise<void> {
    await expect(this.tab(key)).toHaveAttribute('aria-selected', 'true');
  }

  summaryCard(label: string): Locator {
    return this.activePanel
      .locator('[data-slot="card"]')
      .filter({ has: this.page.getByText(label, { exact: true }) })
      .first();
  }

  summaryValue(label: string): Locator {
    return this.summaryCard(label).locator('p').last();
  }

  async totalDuration(): Promise<string> {
    return ((await this.summaryValue('Total').textContent()) ?? '').trim();
  }

  async expectSummary(): Promise<void> {
    const metrics: ReadonlyArray<{
      label: string;
      pattern: RegExp;
    }> = [
      { label: 'Total', pattern: DURATION_PATTERN },
      { label: 'Regular', pattern: DURATION_PATTERN },
      { label: 'Overtime', pattern: DURATION_PATTERN },
      { label: 'Double time', pattern: DURATION_PATTERN },
      { label: 'Paid leave', pattern: DURATION_PATTERN },
      { label: 'Flags', pattern: /^\d+$/ },
      { label: 'Estimated pay', pattern: PAY_PATTERN },
    ];

    for (const { label, pattern } of metrics) {
      await expect(
        this.summaryCard(label),
        `${label} summary card`,
      ).toBeVisible();
      await expect(this.summaryValue(label), `${label} value`).toHaveText(
        pattern,
      );
    }
  }

  dayList(): Locator {
    return this.activePanel.locator('ul').first();
  }

  dayRows(): Locator {
    return this.dayList().locator('li');
  }

  async dayLabels(): Promise<string[]> {
    return this.dayRows().evaluateAll((rows) =>
      rows.map((row) =>
        (row.querySelector('div')?.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim(),
      ),
    );
  }

  async dayEntryTexts(): Promise<string[]> {
    return this.dayRows().evaluateAll((rows) =>
      rows.map((row) =>
        (row.querySelectorAll('div')[1]?.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim(),
      ),
    );
  }

  async expectDailyRows(): Promise<void> {
    const rows = this.dayRows();

    await expect(rows, 'Daily timesheet rows').toHaveCount(7);

    const range = await this.periodRange();
    const labels = await this.dayLabels();

    for (let index = 0; index < 7; index += 1) {
      expect(labels[index], `Day row ${index + 1}`).toBe(
        this.formatDayLabel(addDays(range.start, index)),
      );
    }
  }

  async expectEmptyDailyRows(): Promise<void> {
    const entries = await this.dayEntryTexts();

    expect(entries, 'Empty daily rows').toHaveLength(7);

    for (const entry of entries) {
      expect(entry, 'Empty day entry should show a dash').toBe('–');
    }
  }

  async expectTeamTable(): Promise<void> {
    const table = this.activePanel.getByRole('table');

    await expect(table).toBeVisible();
    await expect(
      table.getByRole('columnheader', {
        name: 'Employee',
        exact: true,
      }),
    ).toBeVisible();

    const headers = (await table.locator('thead th').allInnerTexts()).map(
      (header) => header.replace(/\s+/g, ' ').trim(),
    );

    expect(headers, 'Team table headers').toEqual([
      '',
      'Employee',
      'Status',
      'Hours',
      'Overtime',
      'Flags',
      'Est. pay',
    ]);

    const rows = await this.teamRows();

    expect(rows.length, 'Team timesheet rows').toBeGreaterThan(0);

    for (const row of rows) {
      expect(row.employee, 'Team employee').not.toBe('');
      expect(row.status, `Status for "${row.employee}"`).not.toBe('');
      expect(row.hours, `Hours for "${row.employee}"`).toMatch(
        DURATION_PATTERN,
      );
      expect(row.overtime, `Overtime for "${row.employee}"`).toMatch(
        /^(?:–|\d+h(?:\s*\d+m)?|\d+m)$/,
      );
      expect(row.flags, `Flags for "${row.employee}"`).toMatch(/^(?:–|\d+)$/);
      expect(row.pay, `Pay for "${row.employee}"`).toMatch(
        /^(?:–|\$\d[\d,]*(?:\.\d{1,2})?)$/,
      );
    }
  }

  async teamRows(): Promise<TeamRow[]> {
    return this.activePanel.locator('tbody tr').evaluateAll((rows) =>
      rows.map((row) => {
        const cells = Array.from(row.querySelectorAll('td')).map((cell) =>
          (cell.textContent ?? '').replace(/\s+/g, ' ').trim(),
        );

        return {
          employee: cells[1] ?? '',
          status: cells[2] ?? '',
          hours: cells[3] ?? '',
          overtime: cells[4] ?? '',
          flags: cells[5] ?? '',
          pay: cells[6] ?? '',
        };
      }),
    );
  }

  async expectApproveGating(): Promise<void> {
    const firstRow = this.activePanel.locator('tbody tr').first();
    const checkbox = firstRow.getByRole('checkbox');

    await expect(this.approveButton).toBeDisabled();
    await expect(this.approveButton).toHaveText(/^Approve selected$/);

    await checkbox.click();
    await expect(checkbox).toHaveAttribute('aria-checked', 'true');
    await expect(this.approveButton).toBeEnabled();
    await expect(this.approveButton).toHaveText(
      /^Approve selected \(\d+\)$/,
    );

    await checkbox.click();
    await expect(checkbox).toHaveAttribute('aria-checked', 'false');
    await expect(this.approveButton).toBeDisabled();
    await expect(this.approveButton).toHaveText(/^Approve selected$/);
  }

  async openAddEntryDialog(): Promise<void> {
    await this.addEntryButton.click();
    await expect(this.addEntryDialog).toBeVisible();
  }

  async expectAddEntryDialog(): Promise<void> {
    const dialog = this.addEntryDialog;

    await expect(
      dialog.getByRole('heading', { name: 'Add entry', exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText(
        'Added by hand, so it is flagged Manual and has no location.',
        { exact: true },
      ),
    ).toBeVisible();

    await expect(this.dialogClockIn).toBeVisible();
    await expect(this.dialogClockIn).toHaveAttribute('type', 'datetime-local');
    await expect(this.dialogClockOut).toBeVisible();
    await expect(this.dialogClockOut).toHaveAttribute(
      'type',
      'datetime-local',
    );

    const clockIn = await this.dialogClockIn.inputValue();
    const clockOut = await this.dialogClockOut.inputValue();

    expect(clockIn, 'Default clock-in').toMatch(
      /^\d{4}-\d{2}-\d{2}T09:00$/,
    );
    expect(clockOut, 'Default clock-out').toMatch(
      /^\d{4}-\d{2}-\d{2}T17:00$/,
    );
    expect(clockOut.slice(0, 10), 'Clock-in/out share a date').toBe(
      clockIn.slice(0, 10),
    );

    await expect(this.dialogProject).toHaveText('None');
    await expect(this.dialogOffice).toHaveText('None');
    await expect(this.dialogNote).toHaveValue('');
    await expect(this.dialogReason).toHaveValue('');
    await expect(this.dialogReason).toHaveAttribute(
      'placeholder',
      'Forgot to clock out',
    );

    await expect(this.dialogAddBreakButton).toBeVisible();
    await expect(this.dialogCancelButton).toBeEnabled();
    await expect(this.dialogAddEntryButton).toBeDisabled();
    await this.expectNoBrokenValues(this.addEntryDialog);
  }

  async expectProjectOptions(): Promise<void> {
    await this.expectSelectOptions(this.dialogProject, 'Project');
  }

  async expectOfficeOptions(): Promise<void> {
    await this.expectSelectOptions(this.dialogOffice, 'Office');
  }

  async addBreak(): Promise<void> {
    await this.dialogAddBreakButton.click();
    await expect(this.dialogBreakTypeButton).toBeVisible();
    await expect(this.dialogBreakStart).toBeVisible();
    await expect(this.dialogBreakEnd).toBeVisible();
    await expect(this.dialogRemoveBreakButton).toBeVisible();
    await expect(this.dialogAddEntryButton).toBeDisabled();
  }

  async expectBreakTypeOptions(): Promise<void> {
    await expect(this.dialogBreakTypeButton).toHaveText('Unpaid');
    await this.dialogBreakTypeButton.click();

    const listbox = this.page.getByRole('listbox').last();

    await expect(listbox).toBeVisible();
    const options = await listbox.getByRole('option').allInnerTexts();

    expect(options, 'Break type options').toEqual(
      expect.arrayContaining(['Unpaid', 'Paid']),
    );

    await this.page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
    await expect(this.addEntryDialog).toBeVisible();
  }

  async removeBreak(): Promise<void> {
    await this.dialogRemoveBreakButton.click();
    await expect(this.dialogBreakTypeButton).toBeHidden();
    await expect(this.dialogAddEntryButton).toBeDisabled();
  }

  async fillReason(reason = 'Read-only QA validation'): Promise<void> {
    await this.dialogReason.fill(reason);
    await expect(this.dialogAddEntryButton).toBeEnabled();
  }

  async clearReason(): Promise<void> {
    await this.dialogReason.fill('');
    await expect(this.dialogAddEntryButton).toBeDisabled();
  }

  async expectClockOrderValidation(): Promise<void> {
    const clockIn = await this.dialogClockIn.inputValue();
    const date = clockIn.slice(0, 10);

    await this.dialogClockOut.fill(`${date}T08:00`);
    await expect(this.clockOrderError).toBeVisible();
    await expect(this.dialogAddEntryButton).toBeDisabled();
  }

  async cancelAddEntryDialog(): Promise<void> {
    await this.dialogCancelButton.click();
    await expect(this.addEntryDialog).toBeHidden();
  }

  async expectNoBrokenValues(scope?: Locator): Promise<void> {
    await expect(scope ?? this.main).not.toContainText(
      /NaN|undefined|Invalid Date/,
    );
  }

  private formatDayLabel(date: Date): string {
    return `${DAY_NAMES[date.getUTCDay()]}, ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}`;
  }

  private async expectSelectOptions(
    trigger: Locator,
    label: string,
  ): Promise<void> {
    await trigger.click();

    const listbox = this.page.getByRole('listbox').last();

    await expect(listbox).toBeVisible();

    const options = await listbox.getByRole('option').allInnerTexts();

    expect(options, `${label} options`).toContain('None');

    await this.page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
    await expect(this.addEntryDialog).toBeVisible();
  }

  private async waitForTimesheet(): Promise<void> {
    await this.waitForActivePanel();
    await this.dayRows().first().waitFor({ state: 'visible', timeout: 30_000 });
    await expect(this.dayRows()).toHaveCount(7);
    await this.waitForSkeletonsToClear();
  }

  private async waitForActivePanel(): Promise<void> {
    await this.activePanel.waitFor({ state: 'visible', timeout: 30_000 });
    await this.waitForSkeletonsToClear();
  }
}
