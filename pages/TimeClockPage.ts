import { expect, type Locator, type Page } from '@playwright/test';
import { AppShellPage, type ShellPageOptions } from './AppShellPage';

const DURATION_PATTERN = /^(?:\d+h(?:\s*\d+m)?|\d+m)$/;
const TIMER_PATTERN = /^\d+:\d{2}:\d{2}$/;
const TIME_PATTERN = /^\d{1,2}:\d{2} (?:AM|PM)$/;
const DATE_PATTERN = /^[A-Z][a-z]+, [A-Z][a-z]+ \d{1,2}$/;
const STATUS_PATTERN = /off the clock|on the clock|on break|clocked in/i;
const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Time Clock module (Module 5). Read-only coverage for the live clock, current
 * clock state, project picker, today summary and weekly chart. Clock in/out,
 * breaks and job switching are intentionally not exercised because they mutate
 * the shared workspace and the user's time entry.
 */
export class TimeClockPage extends AppShellPage {
  readonly heading: Locator;
  readonly description: Locator;
  readonly liveTime: Locator;
  readonly liveDate: Locator;
  readonly statusChip: Locator;
  readonly timer: Locator;
  readonly readyCopy: Locator;
  readonly clockInButton: Locator;
  readonly clockStateAction: Locator;
  readonly locationNotice: Locator;
  readonly jobCombobox: Locator;
  readonly jobListbox: Locator;
  readonly todayCard: Locator;
  readonly workedValue: Locator;
  readonly entriesValue: Locator;
  readonly todayEmptyMessage: Locator;
  readonly thisWeekCard: Locator;
  readonly weekDescription: Locator;
  readonly weekChart: Locator;

  constructor(page: Page, options: ShellPageOptions = {}) {
    super(page, options);
    this.heading = this.main.getByRole('heading', {
      name: 'Time clock',
      level: 1,
      exact: true,
    });
    this.description = this.main
      .getByText('Clock in and out, take breaks and switch jobs.', {
        exact: true,
      })
      .first();
    this.liveTime = this.main.getByText(TIME_PATTERN).first();
    this.liveDate = this.main.getByText(DATE_PATTERN).first();
    this.statusChip = this.main.getByText(STATUS_PATTERN).first();
    this.timer = this.main.getByText(TIMER_PATTERN).first();
    this.readyCopy = this.main.getByText('Ready when you are', {
      exact: true,
    });
    this.clockInButton = this.main.getByRole('button', {
      name: 'Clock in',
      exact: true,
    });
    this.clockStateAction = this.main
      .getByRole('button', { name: /clock out|end break|start break|break/i })
      .first();
    this.locationNotice = this.main.getByText(
      'We check your location once, only when you tap.',
      { exact: true },
    );
    // While the Radix listbox is open the rest of the page is aria-hidden, so
    // target the trigger by id from the page root rather than through <main>.
    this.jobCombobox = page.locator('#clock-job');
    this.jobListbox = page.getByRole('listbox');
    this.todayCard = this.main
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText('Today', { exact: true }) })
      .first();
    this.workedValue = this.todayCard
      .getByText('Worked', { exact: true })
      .locator('xpath=following-sibling::p');
    this.entriesValue = this.todayCard
      .getByText('Entries', { exact: true })
      .locator('xpath=following-sibling::p');
    this.todayEmptyMessage = this.todayCard.getByText(
      'Your clock-ins, breaks and clock-outs show up here.',
      { exact: true },
    );
    this.thisWeekCard = this.main
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText('This week', { exact: true }) })
      .first();
    this.weekDescription = this.thisWeekCard.locator(
      '[data-slot="card-description"]',
    );
    this.weekChart = this.main.getByRole('img', {
      name: /Hours worked each day this week/,
    });
  }

  async goto(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/time-clock'));
    await this.heading.waitFor({ state: 'visible', timeout: 30_000 });
    await this.statusChip.waitFor({ state: 'visible', timeout: 30_000 });
    await this.jobCombobox.waitFor({ state: 'visible', timeout: 30_000 });
    await this.waitForSkeletonsToClear();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.description).toBeVisible();

    await expect(this.liveTime).toBeVisible();
    await expect(this.liveTime).toHaveText(TIME_PATTERN);
    await expect(this.liveDate).toBeVisible();
    await expect(this.liveDate).toHaveText(DATE_PATTERN);

    await expect(this.statusChip).toBeVisible();
    await expect(this.statusChip).toHaveText(STATUS_PATTERN);
    await expect(this.timer).toBeVisible();
    await expect(this.timer).toHaveText(TIMER_PATTERN);

    await expect(this.jobCombobox).toBeVisible();
    await expect(this.jobCombobox).toHaveAccessibleName(/Working on/);
    await expect(this.locationNotice).toBeVisible();

    if (await this.isOffClock()) {
      await expect(this.clockInButton).toBeVisible();
      await expect(this.clockInButton).toBeEnabled();
      await expect(this.readyCopy).toBeVisible();
    } else {
      await expect(this.clockStateAction).toBeVisible();
    }

    await this.expectTodayCard();
    await this.expectWeekCard();
    await this.expectNoBrokenValues();
  }

  async clockStatus(): Promise<string> {
    return ((await this.statusChip.textContent()) ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async isOffClock(): Promise<boolean> {
    return (await this.clockStatus()) === 'Off the clock';
  }

  async timerText(): Promise<string> {
    return ((await this.timer.textContent()) ?? '').trim();
  }

  async expectOffClockState(): Promise<void> {
    await expect(this.statusChip).toHaveText('Off the clock');
    await expect(this.timer).toHaveText('0:00:00');
    await expect(this.readyCopy).toBeVisible();
    await expect(this.clockInButton).toBeVisible();
    await expect(this.clockInButton).toBeEnabled();
  }

  async openProjectPicker(): Promise<void> {
    await this.jobCombobox.click();
    await expect(this.jobListbox).toBeVisible();
    await expect(this.jobCombobox).toHaveAttribute('aria-expanded', 'true');
  }

  async projectOptions(): Promise<string[]> {
    return this.jobListbox.getByRole('option').allInnerTexts();
  }

  async selectProject(name: string): Promise<void> {
    if ((await this.jobCombobox.getAttribute('aria-expanded')) !== 'true') {
      await this.jobCombobox.click();
    }

    await expect(this.jobListbox).toBeVisible();
    await this.jobListbox.getByRole('option', { name, exact: true }).click();
    await expect(this.jobCombobox).toHaveText(name);
    await expect(this.jobListbox).toBeHidden();
  }

  async closeProjectPicker(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.jobListbox).toBeHidden();
  }

  async expectProject(name: string): Promise<void> {
    await expect(this.jobCombobox).toHaveText(name);
  }

  async todayWorked(): Promise<string> {
    return ((await this.workedValue.textContent()) ?? '').trim();
  }

  async todayEntries(): Promise<number> {
    const text = ((await this.entriesValue.textContent()) ?? '').trim();
    const match = text.match(/^(\d+)$/);

    return match ? Number(match[1]) : -1;
  }

  async expectTodayCard(): Promise<void> {
    await expect(this.todayCard).toBeVisible();
    await expect(this.workedValue).toHaveText(DURATION_PATTERN);
    await expect(this.entriesValue).toHaveText(/^\d+$/);
  }

  async expectTodayEmpty(): Promise<void> {
    await expect(this.todayEmptyMessage).toBeVisible();
    await expect(this.workedValue).toHaveText('0m');
    await expect(this.entriesValue).toHaveText('0');
  }

  async weekTotal(): Promise<string> {
    const text = ((await this.weekDescription.textContent()) ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    const match = text.match(/^(.+?) worked so far$/);

    return match ? match[1] : text;
  }

  async expectWeekCard(): Promise<void> {
    await expect(this.thisWeekCard).toBeVisible();
    await expect(this.weekDescription).toHaveText(
      /^(?:\d+h(?:\s*\d+m)?|\d+m) worked so far$/,
    );

    const total = await this.weekTotal();

    await expect(this.weekChart).toBeVisible();
    await expect(this.weekChart).toHaveAttribute(
      'aria-label',
      new RegExp(
        `^Hours worked each day this week, ${escapeRegExp(total)} in total$`,
      ),
    );

    const labels = await this.weekChart.locator('span').allInnerTexts();

    expect(labels, 'Weekly chart day labels').toEqual([...WEEK_DAYS]);
  }

  async expectNoBrokenValues(): Promise<void> {
    await expect(this.main).not.toContainText(/NaN|undefined|Invalid Date/);
  }
}
