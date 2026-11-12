import { expect, type Locator, type Page } from '@playwright/test';
import { AppShellPage, type ShellPageOptions } from './AppShellPage';

export const SCHEDULE_FILTERS = ['Departments', 'Offices'] as const;

export type ScheduleFilter = (typeof SCHEDULE_FILTERS)[number];

export interface EmployeeRow {
  name: string;
  hours: string;
}

export interface WeekRange {
  start: Date;
  end: Date;
  label: string;
}

const DAY_MS = 86_400_000;
const WEEK_LABEL = /^[A-Z][a-z]{2} \d{1,2} – [A-Z][a-z]{2} \d{1,2}, \d{4}$/;
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Parses the schedule heading, e.g. `Nov 9 – Nov 15, 2026`. */
export function parseWeekLabel(label: string): WeekRange {
  const match = label.match(
    /^([A-Z][a-z]{2}) (\d{1,2}) – ([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/,
  );

  if (!match) {
    throw new Error(`Unexpected schedule week label: "${label}"`);
  }

  const [, startMonthName, startDay, endMonthName, endDay, endYearText] =
    match;
  const startMonth = MONTHS[startMonthName];
  const endMonth = MONTHS[endMonthName];
  const endYear = Number(endYearText);

  if (startMonth === undefined || endMonth === undefined) {
    throw new Error(`Unexpected schedule month in week label: "${label}"`);
  }

  // A week can cross a year boundary (e.g. Dec 28 – Jan 3, 2027).
  const startYear = startMonth > endMonth ? endYear - 1 : endYear;

  return {
    start: new Date(Date.UTC(startYear, startMonth, Number(startDay))),
    end: new Date(Date.UTC(endYear, endMonth, Number(endDay))),
    label,
  };
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Schedule module (Module 4). Read-only coverage for the weekly grid,
 * navigation, My shifts, department/office filters, publish gating and the
 * Add shift draft dialog. Creating, copying, discarding or publishing shifts is
 * intentionally not exercised because it mutates shared workspace data.
 */
export class SchedulePage extends AppShellPage {
  readonly heading: Locator;
  readonly description: Locator;
  readonly weekLabel: Locator;
  readonly copyLastWeekButton: Locator;
  readonly discardDraftsButton: Locator;
  readonly publishedButton: Locator;
  readonly previousWeekButton: Locator;
  readonly nextWeekButton: Locator;
  readonly thisWeekButton: Locator;
  readonly myShiftsToggle: Locator;
  readonly departmentsFilterButton: Locator;
  readonly officesFilterButton: Locator;
  readonly table: Locator;
  readonly laborCost: Locator;
  readonly filterDialog: Locator;
  readonly addShiftDialog: Locator;
  readonly myShiftsEmptyMessage: Locator;

  constructor(page: Page, options: ShellPageOptions = {}) {
    super(page, options);
    this.heading = this.main.getByRole('heading', {
      name: 'Schedule',
      level: 1,
      exact: true,
    });
    this.description = this.main
      .getByText(
        /Who works when\. Drafts are only visible to you until you publish\./,
      )
      .first();
    this.weekLabel = this.main.getByText(WEEK_LABEL).first();
    this.copyLastWeekButton = this.main.getByRole('button', {
      name: 'Copy last week',
      exact: true,
    });
    this.discardDraftsButton = this.main.getByRole('button', {
      name: 'Discard drafts',
      exact: true,
    });
    this.publishedButton = this.main.getByRole('button', {
      name: 'Published',
      exact: true,
    });
    this.previousWeekButton = this.main.getByRole('button', {
      name: 'Previous week',
      exact: true,
    });
    this.nextWeekButton = this.main.getByRole('button', {
      name: 'Next week',
      exact: true,
    });
    this.thisWeekButton = this.main.getByRole('button', {
      name: 'This week',
      exact: true,
    });
    this.myShiftsToggle = this.main.getByRole('button', {
      name: 'My shifts',
      exact: true,
    });
    this.departmentsFilterButton = this.filterButton('Departments');
    this.officesFilterButton = this.filterButton('Offices');
    this.table = this.main.getByRole('table');
    this.laborCost = this.main.getByText(/Scheduled labor cost/).first();
    this.filterDialog = page.getByRole('dialog').last();
    this.addShiftDialog = page.getByRole('dialog', { name: 'Add shift' });
    this.myShiftsEmptyMessage = this.main.getByText(
      'You have no shifts this week.',
      { exact: true },
    );
  }

  async goto(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/schedule'));
    await this.heading.waitFor({ state: 'visible', timeout: 30_000 });
    await this.weekLabel.waitFor({ state: 'visible', timeout: 30_000 });
    await this.waitForSchedule();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.description).toBeVisible();
    await expect(this.weekLabel).toBeVisible();
    await expect(this.weekLabel).toHaveText(WEEK_LABEL);

    await expect(this.copyLastWeekButton).toBeVisible();
    await expect(this.discardDraftsButton).toBeVisible();
    await expect(this.publishedButton).toBeVisible();
    await expect(this.previousWeekButton).toBeVisible();
    await expect(this.nextWeekButton).toBeVisible();
    await expect(this.thisWeekButton).toBeVisible();
    await expect(this.myShiftsToggle).toBeVisible();
    await expect(this.departmentsFilterButton).toBeVisible();
    await expect(this.officesFilterButton).toBeVisible();

    await expect(this.table).toBeVisible();
    await expect(this.laborCost).toContainText('Scheduled labor cost');

    await this.expectWeekGrid();
    await this.expectEmployeeRows();
    await this.expectNoBrokenValues();
  }

  async weekLabelText(): Promise<string> {
    return ((await this.weekLabel.textContent()) ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async weekRange(): Promise<WeekRange> {
    return parseWeekLabel(await this.weekLabelText());
  }

  async dayHeaders(): Promise<string[]> {
    const headers = await this.table.locator('thead th').allInnerTexts();

    return headers.slice(1).map((header) => header.replace(/\s+/g, ' ').trim());
  }

  /**
   * Verifies the seven day columns are consecutive and match the week label,
   * and that every employee row exposes an add-shift action per day.
   */
  async expectWeekGrid(): Promise<void> {
    const headers = await this.dayHeaders();

    expect(headers, 'Schedule day columns').toHaveLength(7);

    const range = await this.weekRange();

    for (let index = 0; index < DAY_NAMES.length; index += 1) {
      const expectedDay = addDays(range.start, index).getUTCDate();

      expect(
        headers[index],
        `Day column ${index + 1} should match the week range`,
      ).toBe(`${DAY_NAMES[index]} ${expectedDay}`);
    }

    const rows = this.employeeRowLocators();

    for (let index = 0; index < (await rows.count()); index += 1) {
      const row = rows.nth(index);

      if ((await row.locator('th').count()) === 0) {
        continue;
      }

      await expect(
        row.getByRole('button', { name: /^Add a shift for / }),
        `Employee row ${index + 1} should offer an add-shift action for each day`,
      ).toHaveCount(7);
    }
  }

  async employeeRows(): Promise<EmployeeRow[]> {
    return this.table.locator('tbody tr').evaluateAll((rows) =>
      rows
        .map((row) => {
          const header = row.querySelector('th');

          if (!header) {
            return null;
          }

          const paragraphs = header.querySelectorAll('p');
          const name = paragraphs[0]?.textContent?.trim() ?? '';
          const hours = paragraphs[1]?.textContent?.trim() ?? '';

          return name ? { name, hours } : null;
        })
        .filter((row): row is EmployeeRow => row !== null),
    );
  }

  async expectEmployeeRows(): Promise<void> {
    const rows = await this.employeeRows();

    expect(rows.length, 'Schedule employee rows').toBeGreaterThan(0);

    for (const row of rows) {
      expect(row.name, 'Employee name').not.toBe('');
      expect(
        row.hours,
        `Hours for "${row.name}" should be a duration`,
      ).toMatch(/^\d+h(?:\s*\d+m)?$/);
    }
  }

  async nextWeek(): Promise<void> {
    const before = await this.weekLabelText();

    await this.nextWeekButton.click();
    await expect
      .poll(() => this.weekLabelText(), {
        message: 'Expected Next week to advance the schedule by one week',
      })
      .not.toBe(before);
    await this.waitForSchedule();
  }

  async previousWeek(): Promise<void> {
    const before = await this.weekLabelText();

    await this.previousWeekButton.click();
    await expect
      .poll(() => this.weekLabelText(), {
        message: 'Expected Previous week to move the schedule back one week',
      })
      .not.toBe(before);
    await this.waitForSchedule();
  }

  async goToThisWeek(expectedLabel?: string): Promise<void> {
    await this.thisWeekButton.click();

    if (expectedLabel) {
      await expect
        .poll(() => this.weekLabelText(), {
          message: `Expected This week to return to "${expectedLabel}"`,
        })
        .toBe(expectedLabel);
    }

    await this.waitForSchedule();
  }

  async expectWeekStarts(expectedStart: Date): Promise<void> {
    const range = await this.weekRange();

    expect(range.start.getTime(), 'Week start date').toBe(
      expectedStart.getTime(),
    );
    expect(range.end.getTime(), 'Week end date').toBe(
      addDays(expectedStart, 6).getTime(),
    );
  }

  async myShiftsPressed(): Promise<boolean> {
    return (
      (await this.myShiftsToggle.getAttribute('aria-pressed')) === 'true'
    );
  }

  async toggleMyShifts(): Promise<void> {
    const before = await this.myShiftsPressed();

    await this.myShiftsToggle.click();
    await expect
      .poll(() => this.myShiftsPressed())
      .toBe(!before);
    await expect
      .poll(() => new URL(this.page.url()).search, {
        message: 'Expected My shifts to sync the mine query parameter',
      })
      .toBe(before ? '' : '?mine=1');
    await this.waitForSchedule();
  }

  async expectMyShifts(pressed: boolean): Promise<void> {
    await expect(this.myShiftsToggle).toHaveAttribute(
      'aria-pressed',
      String(pressed),
    );
    await expect
      .poll(() => new URL(this.page.url()).search)
      .toBe(pressed ? '?mine=1' : '');
  }

  async expectMyShiftsEmpty(): Promise<void> {
    await expect(this.myShiftsEmptyMessage).toBeVisible();
  }

  filterButton(label: ScheduleFilter): Locator {
    return this.main
      .getByRole('button', {
        name: new RegExp(`^${escapeRegExp(label)}(?: \\d+)?$`),
      })
      .first();
  }

  async filterCount(label: ScheduleFilter): Promise<number> {
    const text = ((await this.filterButton(label).textContent()) ?? '').replace(
      /\s+/g,
      '',
    );
    const match = text.match(/(\d+)$/);

    return match ? Number(match[1]) : 0;
  }

  async expectFilterCount(
    label: ScheduleFilter,
    count: number,
  ): Promise<void> {
    await expect
      .poll(() => this.filterCount(label), {
        message: `Expected schedule filter "${label}" to show ${count} active value(s)`,
      })
      .toBe(count);
  }

  async openFilter(label: ScheduleFilter): Promise<void> {
    await this.filterButton(label).click();
    await expect(this.filterDialog).toBeVisible();
  }

  async closeFilter(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.filterDialog).toBeHidden();
  }

  async selectFirstFilterOption(label: ScheduleFilter): Promise<void> {
    await this.openFilter(label);

    const option = this.filterDialog.getByRole('option').first();

    await expect(option).toBeVisible();
    await option.click();
    await this.expectFilterCount(label, 1);
    await this.closeFilter();
    await this.waitForSchedule();
  }

  async deselectFirstFilterOption(label: ScheduleFilter): Promise<void> {
    await this.openFilter(label);

    const option = this.filterDialog.getByRole('option').first();

    await expect(option).toHaveAttribute('aria-selected', 'true');
    await option.click();
    await this.expectFilterCount(label, 0);
    await this.closeFilter();
    await this.waitForSchedule();
  }

  /** Department options exist; Offices is empty in the current workspace. */
  async expectFilterOptionSets(): Promise<void> {
    await this.openFilter('Departments');

    const departments = this.filterDialog.getByRole('option');

    await expect(
      departments.first(),
      'Departments filter should expose options',
    ).toBeVisible();
    expect(await departments.count()).toBeGreaterThanOrEqual(1);
    await this.closeFilter();

    await this.openFilter('Offices');

    const offices = this.filterDialog.getByRole('option');

    if ((await offices.count()) > 0) {
      await expect(offices.first()).toBeVisible();
    } else {
      await expect(
        this.filterDialog.getByText('Nothing found.', { exact: true }),
      ).toBeVisible();
    }

    await this.closeFilter();
  }

  async shiftCardCount(): Promise<number> {
    return this.table.locator('tbody td div.space-y-1 > *').count();
  }

  async hasScheduledShifts(): Promise<boolean> {
    if ((await this.shiftCardCount()) > 0) {
      return true;
    }

    const rows = await this.employeeRows();

    return rows.some((row) => !/^0h(?:\s*0m)?$/.test(row.hours));
  }

  async expectPublishControlsGated(): Promise<void> {
    await expect(this.discardDraftsButton).toBeDisabled();
    await expect(this.publishedButton).toBeDisabled();
  }

  async expectEmptySchedule(): Promise<void> {
    await expect(this.laborCost).toHaveText(
      /^Scheduled labor cost \$0(?:\.00)?$/,
    );
    await this.expectPublishControlsGated();

    const rows = await this.employeeRows();

    for (const row of rows) {
      expect(row.hours, `Hours for "${row.name}"`).toMatch(/^0h(?:\s*0m)?$/);
    }

    expect(await this.shiftCardCount(), 'Shift cards').toBe(0);
    await this.expectNoBrokenValues();
  }

  async openAddShiftDialog(): Promise<void> {
    const row = this.employeeRowLocators()
      .filter({ has: this.page.locator('th') })
      .first();

    await row.hover();

    const addButton = row
      .getByRole('button', { name: /^Add a shift for / })
      .first();

    await expect(addButton).toBeVisible();
    await addButton.click();
    await expect(this.addShiftDialog).toBeVisible();
  }

  async expectAddShiftDialog(): Promise<void> {
    const dialog = this.addShiftDialog;

    await expect(
      dialog.getByRole('heading', { name: 'Add shift', exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText(
        'It stays a draft until you publish the schedule.',
        { exact: true },
      ),
    ).toBeVisible();

    for (const field of [
      'shift-employee',
      'shift-day',
      'shift-start',
      'shift-end',
      'shift-team',
      'shift-location',
      'shift-project',
      'shift-break',
      'shift-notes',
      'shift-repeat',
    ]) {
      await expect(dialog.locator(`#${field}`)).toBeVisible();
    }

    await expect(dialog.locator('#shift-employee')).not.toHaveText('');
    await expect(dialog.locator('#shift-day')).toHaveText(
      /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/,
    );
    await expect(dialog.locator('#shift-start')).toHaveValue('09:00');
    await expect(dialog.locator('#shift-end')).toHaveValue('17:00');
    await expect(dialog.locator('#shift-break')).toHaveValue('0');
    await expect(dialog.locator('#shift-notes')).toHaveValue('');

    await expect(
      dialog.getByRole('button', { name: 'Cancel', exact: true }),
    ).toBeEnabled();
    await expect(
      dialog.getByRole('button', { name: 'Add shift', exact: true }),
    ).toBeEnabled();
  }

  async cancelAddShiftDialog(): Promise<void> {
    await this.addShiftDialog
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await expect(this.addShiftDialog).toBeHidden();
  }

  async expectNoBrokenValues(): Promise<void> {
    await expect(this.main).not.toContainText(/NaN|undefined|Invalid Date/);
  }

  private employeeRowLocators(): Locator {
    return this.table.locator('tbody tr');
  }

  private async waitForSchedule(): Promise<void> {
    await this.table.waitFor({ state: 'visible', timeout: 30_000 });
    await this.table
      .locator('thead th')
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 });
    await this.waitForSkeletonsToClear();
  }
}
