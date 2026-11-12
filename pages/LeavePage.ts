import { expect, type Locator, type Page } from '@playwright/test';
import { AppShellPage, type ShellPageOptions } from './AppShellPage';

export type LeaveTabKey = 'mine' | 'requests' | 'calendar';

export interface LeaveTabDefinition {
  label: string;
  query: string;
}

/** Tabs on the Leave module and the URL query each one uses. */
export const LEAVE_TABS: Readonly<Record<LeaveTabKey, LeaveTabDefinition>> = {
  mine: { label: 'My leave', query: '' },
  requests: { label: 'Requests', query: '?tab=requests' },
  calendar: { label: 'Calendar', query: '?tab=calendar' },
} as const;

export const LEAVE_TAB_KEYS: readonly LeaveTabKey[] = [
  'mine',
  'requests',
  'calendar',
] as const;

export const LEAVE_TYPES = [
  'Vacation',
  'Sick',
  'Personal',
  'Unpaid leave',
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_LENGTHS = [
  'Full day',
  'Morning only',
  'Afternoon only',
] as const;

export type LeaveLength = (typeof LEAVE_LENGTHS)[number];

export const LEAVE_STATUS_OPTIONS = [
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled',
  'All',
] as const;

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const MONTH_LABEL = /^[A-Z][a-z]+ \d{4}$/;
const DAY_PATTERN = /^\d{1,2}$/;

const MONTHS_SHORT: Readonly<Record<string, number>> = {
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

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function formatMonthLabel(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month, 1));

  return `${MONTHS_LONG[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function parseMonthLabel(label: string): {
  year: number;
  month: number;
} {
  const match = normalize(label).match(/^([A-Z][a-z]+) (\d{4})$/);

  if (!match) {
    throw new Error(`Unexpected leave month label: "${label}"`);
  }

  const month = MONTHS_LONG.indexOf(
    match[1] as (typeof MONTHS_LONG)[number],
  );

  if (month === -1) {
    throw new Error(`Unexpected leave month name: "${match[1]}"`);
  }

  return { year: Number(match[2]), month };
}

/** Shifts a month heading, e.g. `December 2026`, by a number of months. */
export function shiftMonthLabel(label: string, months: number): string {
  const { year, month } = parseMonthLabel(label);

  return formatMonthLabel(year, month + months);
}

/** Number of days in the month named by a heading, e.g. `February 2027`. */
export function daysInMonth(label: string): number {
  const { year, month } = parseMonthLabel(label);

  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Parses a date trigger label, e.g. `Nov 10, 2026`. */
export function parseDateLabel(label: string): CalendarDate {
  const match = normalize(label).match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/);

  if (!match) {
    throw new Error(`Unexpected leave date label: "${label}"`);
  }

  const month = MONTHS_SHORT[match[1]];

  if (month === undefined) {
    throw new Error(`Unexpected leave month in date label: "${label}"`);
  }

  return { year: Number(match[3]), month, day: Number(match[2]) };
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const result = new Date(
    Date.UTC(date.year, date.month, date.day + days),
  );

  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth(),
    day: result.getUTCDate(),
  };
}

/** Leave requests only count Monday–Friday towards their duration. */
export function isWeekday(date: CalendarDate): boolean {
  const day = new Date(
    Date.UTC(date.year, date.month, date.day),
  ).getUTCDay();

  return day !== 0 && day !== 6;
}

export function formatDateLabel(date: CalendarDate): string {
  return `${MONTHS_LONG[date.month].slice(0, 3)} ${date.day}, ${date.year}`;
}

function formatPickerDay(date: CalendarDate): string {
  return `${date.month + 1}/${date.day}/${date.year}`;
}

export type LeaveDateField = 'start' | 'end';

/**
 * Leave module (Module 7). Read-only coverage for the balance cards, personal
 * requests, team request queue, monthly leave calendar and the Request leave
 * dialog. Submitting, approving, rejecting or cancelling leave is intentionally
 * not exercised because it mutates the shared workspace. Choosing dates calls
 * the dialog's non-mutating preview endpoint; nothing is ever submitted.
 */
export class LeavePage extends AppShellPage {
  readonly heading: Locator;
  readonly description: Locator;
  readonly requestLeaveButton: Locator;
  readonly tabList: Locator;
  readonly activePanel: Locator;
  readonly balanceSection: Locator;
  readonly requestsSection: Locator;
  readonly requestsSectionHeading: Locator;
  readonly emptyRequestsMessage: Locator;
  readonly emptyRequestsDescription: Locator;
  readonly emptyRequestsButton: Locator;
  readonly statusCombobox: Locator;
  readonly queueEmptyMessage: Locator;
  readonly queueEmptyDescription: Locator;
  readonly calendarMonthHeading: Locator;
  readonly calendarPreviousMonthButton: Locator;
  readonly calendarNextMonthButton: Locator;
  readonly calendarTodayButton: Locator;
  readonly calendarCard: Locator;
  readonly requestDialog: Locator;
  readonly dialogHeading: Locator;
  readonly dialogDescription: Locator;
  readonly dialogFor: Locator;
  readonly dialogType: Locator;
  readonly dialogStart: Locator;
  readonly dialogEnd: Locator;
  readonly dialogNote: Locator;
  readonly dialogAttachButton: Locator;
  readonly dialogLengthGroup: Locator;
  readonly dialogSummary: Locator;
  readonly dialogRangeError: Locator;
  readonly dialogCancelButton: Locator;
  readonly dialogSendButton: Locator;
  readonly dialogCloseButton: Locator;

  constructor(page: Page, options: ShellPageOptions = {}) {
    super(page, options);
    this.heading = this.main.getByRole('heading', {
      name: 'Leave',
      level: 1,
      exact: true,
    });
    this.description = this.main
      .getByText('Balances, requests and who is off.', { exact: true })
      .first();
    this.requestLeaveButton = this.main
      .getByRole('button', { name: 'Request leave', exact: true })
      .first();
    this.tabList = page.getByRole('tablist').first();
    this.activePanel = page
      .locator('[role="tabpanel"]:not([hidden])')
      .first();

    this.balanceSection = this.main.locator('section[aria-label="Balances"]');
    this.requestsSection = this.main.locator(
      'section[aria-label="Requests"]',
    );
    this.requestsSectionHeading = this.requestsSection.getByRole('heading', {
      name: 'Your requests',
      exact: true,
    });
    this.emptyRequestsMessage = this.requestsSection.getByText(
      'No leave requested yet',
      { exact: true },
    );
    this.emptyRequestsDescription = this.requestsSection.getByText(
      'Request vacation, sick or personal days and track them here.',
      { exact: true },
    );
    this.emptyRequestsButton = this.requestsSection.getByRole('button', {
      name: 'Request leave',
      exact: true,
    });

    this.statusCombobox = this.main.getByRole('combobox', {
      name: 'Status',
      exact: true,
    });
    this.queueEmptyMessage = this.main.getByText('Nothing waiting for you', {
      exact: true,
    });
    this.queueEmptyDescription = this.main.getByText(
      'New leave requests from your team show up here.',
      { exact: true },
    );

    this.calendarMonthHeading = this.main
      .getByRole('heading', { level: 2 })
      .filter({ hasText: MONTH_LABEL })
      .first();
    this.calendarPreviousMonthButton = this.main.getByRole('button', {
      name: 'Previous month',
      exact: true,
    });
    this.calendarNextMonthButton = this.main.getByRole('button', {
      name: 'Next month',
      exact: true,
    });
    this.calendarTodayButton = this.main.getByRole('button', {
      name: 'Today',
      exact: true,
    });
    this.calendarCard = this.activePanel
      .locator('[data-slot="card"]')
      .first();

    this.requestDialog = page
      .locator('[data-slot="dialog-content"]')
      .last();
    this.dialogHeading = this.requestDialog.getByRole('heading', {
      name: 'Request leave',
      exact: true,
    });
    this.dialogDescription = this.requestDialog.getByText(
      'Your approver is notified. Pending requests count against your balance.',
      { exact: true },
    );
    this.dialogFor = this.requestDialog.locator('#leave-for');
    this.dialogType = this.requestDialog.locator('#leave-type');
    this.dialogStart = this.requestDialog.locator('#leave-start');
    this.dialogEnd = this.requestDialog.locator('#leave-end');
    this.dialogNote = this.requestDialog.locator('#leave-note');
    this.dialogAttachButton = this.requestDialog.getByRole('button', {
      name: "Attach a note (e.g. doctor's)",
      exact: true,
    });
    this.dialogLengthGroup =
      this.requestDialog.getByRole('radiogroup');
    this.dialogSummary = this.requestDialog.locator('[aria-live="polite"]');
    this.dialogRangeError = this.requestDialog.getByText(
      "The last day can't be before the first.",
      { exact: true },
    );
    this.dialogCancelButton = this.requestDialog.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });
    this.dialogSendButton = this.requestDialog.getByRole('button', {
      name: 'Send request',
      exact: true,
    });
    this.dialogCloseButton = this.requestDialog.getByRole('button', {
      name: 'Close',
      exact: true,
    });
  }

  async goto(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/leave'));
    await this.heading.waitFor({ state: 'visible', timeout: 30_000 });
    await this.balanceSection.waitFor({ state: 'visible', timeout: 30_000 });
    await this.balanceCards().first().waitFor({
      state: 'visible',
      timeout: 30_000,
    });
    await this.waitForSkeletonsToClear();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.description).toBeVisible();
    await expect(this.requestLeaveButton).toBeVisible();
    await expect(this.tabList).toBeVisible();
    await this.expectTab('mine');
    await this.expectBalances();
    await expect(this.requestsSection).toBeVisible();
    await expect(this.requestsSectionHeading).toBeVisible();

    if (await this.emptyRequestsMessage.isVisible()) {
      await this.expectEmptyRequests();
    }

    await this.expectNoBrokenValues();
  }

  tab(key: LeaveTabKey): Locator {
    return this.tabList.getByRole('tab', {
      name: LEAVE_TABS[key].label,
      exact: true,
    });
  }

  async expectTab(key: LeaveTabKey): Promise<void> {
    await expect(this.tab(key)).toHaveAttribute('aria-selected', 'true');
  }

  async selectTab(key: LeaveTabKey): Promise<void> {
    await this.tab(key).click();
    await this.expectTab(key);
    await expect
      .poll(() => new URL(this.page.url()).search, {
        message: `Expected the ${LEAVE_TABS[key].label} tab to sync the URL`,
      })
      .toBe(LEAVE_TABS[key].query);
    await this.waitForTab(key);
  }

  balanceCards(): Locator {
    return this.balanceSection.locator('[data-slot="card"]');
  }

  balanceCard(name: LeaveType): Locator {
    return this.balanceCards()
      .filter({ hasText: name })
      .first();
  }

  balanceValue(name: LeaveType): Locator {
    return this.balanceCard(name).locator('p').first();
  }

  balanceMeta(name: LeaveType): Locator {
    return this.balanceCard(name).locator('p').nth(1);
  }

  async balanceSectionText(): Promise<string> {
    return normalize(await this.balanceSection.innerText());
  }

  async requestsSectionText(): Promise<string> {
    return normalize(await this.requestsSection.innerText());
  }

  async expectBalances(): Promise<void> {
    const cards = this.balanceCards();

    await expect(cards, 'Leave balance cards').toHaveCount(4);

    for (const name of ['Vacation', 'Sick', 'Personal'] as const) {
      await expect(this.balanceCard(name), `${name} balance card`).toBeVisible();
      await expect(this.balanceValue(name), `${name} balance`).toHaveText(
        /^\d+(?:\.\d+)? days?$/,
      );
      await expect(this.balanceMeta(name), `${name} balance detail`).toHaveText(
        /^\d+(?:\.\d+)? days a year · \d+(?:\.\d+)? days used$/,
      );
      await expect(
        this.balanceSection.getByRole('progressbar', {
          name: `${name} used`,
          exact: true,
        }),
        `${name} usage bar`,
      ).toBeVisible();
    }

    await expect(
      this.balanceCard('Unpaid leave'),
      'Unpaid leave balance card',
    ).toBeVisible();
    await expect(this.balanceValue('Unpaid leave')).toHaveText('Unlimited');
    await expect(this.balanceMeta('Unpaid leave')).toHaveText(
      /^No limit · \d+(?:\.\d+)? days used$/,
    );

    await expect(
      this.balanceSection.getByRole('progressbar'),
      'Only paid leave types have usage bars',
    ).toHaveCount(3);
  }

  async expectEmptyRequests(): Promise<void> {
    await expect(this.requestsSection).toBeVisible();
    await expect(this.requestsSectionHeading).toBeVisible();
    await expect(this.emptyRequestsMessage).toBeVisible();
    await expect(this.emptyRequestsDescription).toBeVisible();
    await expect(this.emptyRequestsButton).toBeVisible();
  }

  async expectStatusFilter(status: string = 'Pending'): Promise<void> {
    await expect(this.statusCombobox).toBeVisible();
    await expect(this.statusCombobox).toHaveText(status);
  }

  async expectStatusOptions(): Promise<void> {
    await this.statusCombobox.click();

    const listbox = this.page.getByRole('listbox').last();

    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole('option')).toHaveCount(
      LEAVE_STATUS_OPTIONS.length,
    );

    const options = (await listbox.getByRole('option').allInnerTexts()).map(
      normalize,
    );

    expect(options, 'Leave request status filters').toEqual([
      ...LEAVE_STATUS_OPTIONS,
    ]);

    await this.page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
  }

  async selectStatus(status: (typeof LEAVE_STATUS_OPTIONS)[number]): Promise<void> {
    await this.statusCombobox.click();

    const listbox = this.page.getByRole('listbox').last();

    await expect(listbox).toBeVisible();
    await listbox.getByRole('option', { name: status, exact: true }).click();
    await expect(this.statusCombobox).toHaveText(status);
    await this.waitForRequestsQueue();
  }

  async expectQueueEmpty(): Promise<void> {
    await expect(this.queueEmptyMessage).toBeVisible();
    await expect(this.queueEmptyDescription).toBeVisible();
  }

  monthLabel(): Promise<string> {
    return this.calendarMonthHeading.innerText().then(normalize);
  }

  async expectMonthLabel(label: string): Promise<void> {
    await expect(this.calendarMonthHeading).toHaveText(label);
  }

  calendarHeaderGrid(): Locator {
    return this.calendarCard.locator('.grid.grid-cols-7').first();
  }

  calendarDayGrid(): Locator {
    return this.calendarCard.locator('.grid.grid-cols-7').nth(1);
  }

  async nextMonth(): Promise<void> {
    const before = await this.monthLabel();

    await this.calendarNextMonthButton.click();
    await expect
      .poll(() => this.monthLabel(), {
        message: 'Expected Next month to advance the leave calendar',
      })
      .not.toBe(before);
    await this.waitForCalendar();
  }

  async previousMonth(): Promise<void> {
    const before = await this.monthLabel();

    await this.calendarPreviousMonthButton.click();
    await expect
      .poll(() => this.monthLabel(), {
        message: 'Expected Previous month to move the leave calendar back',
      })
      .not.toBe(before);
    await this.waitForCalendar();
  }

  async goToToday(expectedLabel?: string): Promise<void> {
    await this.calendarTodayButton.click();

    if (expectedLabel) {
      await expect
        .poll(() => this.monthLabel(), {
          message: `Expected Today to return to "${expectedLabel}"`,
        })
        .toBe(expectedLabel);
    }

    await this.waitForCalendar();
  }

  async expectMonthGrid(): Promise<void> {
    const label = await this.monthLabel();
    const headerGrid = this.calendarHeaderGrid();
    const dayGrid = this.calendarDayGrid();
    const totalDays = daysInMonth(label);
    const cells = dayGrid.locator('> div');

    await expect(this.calendarMonthHeading).toHaveText(MONTH_LABEL);
    await expect(
      headerGrid.locator('> div'),
      'Leave calendar weekday headers',
    ).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

    await expect
      .poll(
        async () => {
          const count = await cells.count();

          return count >= 28 && count <= 42 && count % 7 === 0
            ? count
            : 0;
        },
        { message: 'Expected a complete leave calendar week grid' },
      )
      .toBeGreaterThan(0);

    const cellCount = await cells.count();
    const outOfMonth = dayGrid.locator('> div[class*="bg-muted/30"]');

    expect(cellCount % 7, 'Leave calendar rows').toBe(0);
    expect(
      await outOfMonth.count(),
      'Out-of-month day cells',
    ).toBe(cellCount - totalDays);
    await expect(
      dayGrid.locator('> div:not([class*="bg-muted/30"])'),
      'In-month day cells',
    ).toHaveCount(totalDays);

    const numbers = (await dayGrid.locator('> div > span').allInnerTexts()).map(
      normalize,
    );

    expect(numbers, 'Every day cell has a day number').toHaveLength(
      cellCount,
    );

    for (const number of numbers) {
      expect(number, 'Day number').toMatch(DAY_PATTERN);
    }

    expect(
      await dayGrid.locator('span.bg-primary').count(),
      'At most one day can be highlighted as today',
    ).toBeLessThanOrEqual(1);
  }

  async expectTodayHighlighted(): Promise<void> {
    await expect(
      this.calendarDayGrid().locator('span.bg-primary'),
      'The current month should highlight today',
    ).toHaveCount(1);
  }

  async expectCalendarLegend(): Promise<void> {
    await expect(
      this.activePanel.getByText('Approved', { exact: true }),
      'Calendar legend: Approved',
    ).toBeVisible();
    await expect(
      this.activePanel.getByText('Pending', { exact: true }),
      'Calendar legend: Pending',
    ).toBeVisible();
  }

  async openRequestLeaveDialog(): Promise<void> {
    await this.requestLeaveButton.click();
    await expect(this.requestDialog).toBeVisible();
    await expect(this.dialogHeading).toBeVisible();
  }

  async expectRequestLeaveDialog(): Promise<void> {
    await expect(this.dialogHeading).toBeVisible();
    await expect(this.dialogDescription).toBeVisible();
    await expect(this.dialogFor).toBeVisible();
    await expect(this.dialogType).toHaveText('Choose a type');
    await expect(this.dialogStart).toHaveText('Pick a date');
    await expect(this.dialogEnd).toHaveText('Pick a date');
    await expect(this.dialogStart).toBeVisible();
    await expect(this.dialogEnd).toBeVisible();
    await expect(this.dialogLengthGroup).toBeHidden();
    await expect(this.dialogNote).toHaveValue('');
    await expect(this.dialogAttachButton).toBeVisible();
    await expect(this.dialogCancelButton).toBeEnabled();
    await expect(this.dialogCloseButton).toBeEnabled();
    await expect(this.dialogSendButton).toBeDisabled();
    await this.expectNoBrokenValues(this.requestDialog);
  }

  async startDate(): Promise<CalendarDate> {
    return parseDateLabel(await this.dialogStart.innerText());
  }

  async endDate(): Promise<CalendarDate> {
    return parseDateLabel(await this.dialogEnd.innerText());
  }

  async expectForOptions(): Promise<void> {
    await expect(this.dialogFor).not.toHaveText('');

    await this.dialogFor.click();

    const listbox = this.page.getByRole('listbox').last();

    await expect(listbox).toBeVisible();

    const options = (await listbox.getByRole('option').allInnerTexts()).map(
      normalize,
    );

    expect(options.length, 'Leave "For" options').toBeGreaterThanOrEqual(1);
    expect(
      options.some((option) => option.includes('(me)')),
      'The owner should be selectable in the "For" picker',
    ).toBe(true);

    for (const option of options) {
      expect(option, 'Leave "For" option').not.toBe('');
    }

    await this.page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
    await expect(this.requestDialog).toBeVisible();
  }

  async expectTypeOptions(): Promise<void> {
    await this.dialogType.click();

    const listbox = this.page.getByRole('listbox').last();

    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole('option')).toHaveCount(
      LEAVE_TYPES.length,
    );

    const options = (await listbox.getByRole('option').allInnerTexts()).map(
      normalize,
    );

    expect(options, 'Leave type options').toEqual([
      'Vacation',
      'Sick',
      'Personal',
      'Unpaid leave unpaid',
    ]);

    await this.page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
    await expect(this.requestDialog).toBeVisible();
  }

  async selectType(type: LeaveType): Promise<void> {
    await this.dialogType.click();

    const listbox = this.page.getByRole('listbox').last();

    await expect(listbox).toBeVisible();
    await listbox.getByRole('option', { name: type, exact: true }).click();
    await expect(this.dialogType).toContainText(type);
  }

  async expectLengthOptions(): Promise<void> {
    const radios = this.requestDialog.getByRole('radio');

    await expect(radios, 'Leave length options').toHaveCount(3);

    for (const length of LEAVE_LENGTHS) {
      await expect(this.lengthRadio(length)).toBeVisible();
    }
  }

  lengthRadio(length: LeaveLength): Locator {
    return this.requestDialog.getByRole('radio', {
      name: length,
      exact: true,
    });
  }

  async expectLength(length: LeaveLength): Promise<void> {
    await expect(this.lengthRadio(length)).toHaveAttribute(
      'aria-checked',
      'true',
    );
  }

  async selectLength(length: LeaveLength): Promise<void> {
    await this.lengthRadio(length).click();
    await this.expectLength(length);
  }

  async summaryDuration(): Promise<string> {
    return normalize(
      await this.dialogSummary.locator('p').first().innerText(),
    );
  }

  async summaryBalance(): Promise<string> {
    return normalize(
      await this.dialogSummary.locator('p').nth(1).innerText(),
    );
  }

  async expectSummaryDuration(pattern: RegExp): Promise<void> {
    await expect
      .poll(() => this.summaryDuration(), {
        message: 'Expected the leave preview to describe the requested days',
      })
      .toMatch(pattern);
  }

  async expectSummaryBalance(): Promise<void> {
    await expect(this.dialogSummary.locator('p').nth(1)).toHaveText(
      /^[A-Z][A-Za-z ]+: \d+(?:\.\d+)? days? left → \d+(?:\.\d+)? days? after this request$/,
    );
  }

  /**
   * Opens a date picker, walks to the requested month if needed and selects the
   * day. The popover's data-day attribute uses the M/D/YYYY format.
   */
  async pickDate(field: LeaveDateField, date: CalendarDate): Promise<void> {
    const popover = await this.openDatePicker(field);

    await this.choosePickerDay(field, popover, date);
  }

  /**
   * Picks the first weekday on or after `preferredDay` in the month after the
   * picker's opening month. This keeps the dialog test independent of today's
   * date, month length and weekend placement while still exercising month
   * navigation inside the date picker.
   */
  async pickWeekdayInFollowingMonth(
    field: LeaveDateField,
    preferredDay: number,
  ): Promise<CalendarDate> {
    const popover = await this.openDatePicker(field);
    const caption = popover.getByRole('status');
    const current = parseMonthLabel(normalize(await caption.innerText()));

    let date: CalendarDate = {
      year: current.year,
      month: current.month + 1,
      day: preferredDay,
    };

    while (!isWeekday(date)) {
      date = addDays(date, 1);
    }

    await this.choosePickerDay(field, popover, date);

    return date;
  }

  async expectSendEnabled(): Promise<void> {
    await expect(this.dialogSendButton).toBeEnabled();
  }

  async expectSendDisabled(): Promise<void> {
    await expect(this.dialogSendButton).toBeDisabled();
  }

  async expectEndBeforeStartError(): Promise<void> {
    await expect(this.dialogRangeError).toBeVisible();
    await expect(this.dialogSendButton).toBeDisabled();
    await expect(this.dialogLengthGroup).toBeHidden();
  }

  async expectRangeAccepted(): Promise<void> {
    await expect(this.dialogRangeError).toBeHidden();
    await expect(this.dialogSendButton).toBeEnabled();
  }

  /**
   * The Length fieldset normally appears once a valid first/last range is set.
   * After an end-before-start error has been corrected the app keeps it hidden
   * while still enabling Send request (QA-013); callers can detect that state
   * and annotate the known issue instead of failing the read-only suite.
   */
  async lengthControlIsVisible(): Promise<boolean> {
    return this.dialogLengthGroup.isVisible();
  }

  async fillReason(reason = 'Read-only QA validation'): Promise<void> {
    await this.dialogNote.fill(reason);
    await expect(this.dialogNote).toHaveValue(reason);
  }

  async clearReason(): Promise<void> {
    await this.dialogNote.fill('');
    await expect(this.dialogNote).toHaveValue('');
  }

  async cancelRequestLeaveDialog(): Promise<void> {
    await this.dialogCancelButton.click();
    await expect(this.requestDialog).toBeHidden();
  }

  async expectNoBrokenValues(scope?: Locator): Promise<void> {
    await expect(scope ?? this.main).not.toContainText(
      /NaN|undefined|Invalid Date/,
    );
  }

  private async waitForTab(key: LeaveTabKey): Promise<void> {
    if (key === 'mine') {
      await this.balanceSection.waitFor({
        state: 'visible',
        timeout: 30_000,
      });
      await this.balanceCards().first().waitFor({
        state: 'visible',
        timeout: 30_000,
      });
    }

    if (key === 'requests') {
      await this.waitForRequestsQueue();
    }

    if (key === 'calendar') {
      await this.waitForCalendar();
    }

    await this.waitForSkeletonsToClear();
  }

  private async waitForRequestsQueue(): Promise<void> {
    await expect(this.statusCombobox).toBeVisible();

    if (!(await this.queueEmptyMessage.isVisible())) {
      await expect(
        this.main.locator('[data-slot="card"]').first(),
      ).toBeVisible();
    }

    await this.waitForSkeletonsToClear();
  }

  private async waitForCalendar(): Promise<void> {
    await expect(this.calendarMonthHeading).toBeVisible();
    await expect(this.calendarMonthHeading).toHaveText(MONTH_LABEL);
    await expect
      .poll(
        async () => {
          const count = await this.calendarDayGrid()
            .locator('> div')
            .count();

          return count >= 28 && count <= 42 && count % 7 === 0
            ? count
            : 0;
        },
        { message: 'Expected a complete leave calendar week grid' },
      )
      .toBeGreaterThan(0);
    await this.waitForSkeletonsToClear();
  }

  private async openDatePicker(field: LeaveDateField): Promise<Locator> {
    const trigger = this.dateTrigger(field);

    await trigger.click();

    const popover = this.page
      .locator('[data-slot="popover-content"]')
      .last();

    await expect(popover).toBeVisible();
    await expect(popover.getByRole('status')).toHaveText(MONTH_LABEL);

    return popover;
  }

  private async choosePickerDay(
    field: LeaveDateField,
    popover: Locator,
    date: CalendarDate,
  ): Promise<void> {
    const trigger = this.dateTrigger(field);
    const caption = popover.getByRole('status');
    const targetMonth = formatMonthLabel(date.year, date.month);

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const current = normalize(await caption.innerText());

      if (current === targetMonth) {
        break;
      }

      const currentMonth = parseMonthLabel(current);
      const offset =
        date.year * 12 +
        date.month -
        (currentMonth.year * 12 + currentMonth.month);
      const direction = offset > 0 ? 'Next' : 'Previous';

      await popover
        .getByRole('button', { name: `Go to the ${direction} Month` })
        .click();
      await expect
        .poll(() => caption.innerText().then(normalize), {
          message: `Expected the date picker to move from ${current}`,
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

  private dateTrigger(field: LeaveDateField): Locator {
    return field === 'start' ? this.dialogStart : this.dialogEnd;
  }
}
