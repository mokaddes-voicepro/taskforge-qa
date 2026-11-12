import { expect, type Locator, type Page } from '@playwright/test';
import { AppShellPage, type ShellPageOptions } from './AppShellPage';

/** Flag labels rendered on working-now rows. */
export const WORKING_NOW_FLAG_LABELS = {
  LATE: 'Late',
  EARLY_IN: 'Early',
  LEFT_EARLY: 'Left early',
  UNSCHEDULED: 'Unscheduled',
  OUTSIDE_LOCATION: 'Outside location',
  NO_LOCATION: 'No location',
  MISSING_CLOCK_OUT: 'Missing clock-out',
  EDITED: 'Edited',
  MANUAL: 'Manual',
} as const;

export type WorkingNowFlagLabel =
  (typeof WORKING_NOW_FLAG_LABELS)[keyof typeof WORKING_NOW_FLAG_LABELS];

export interface WorkingNowEntry {
  name: string;
  meta: string;
  flags: string[];
  clockOutLabel: string | null;
}

export interface WorkingNowSection {
  title: string;
  count: number;
  emptyCopy: string;
  entries: WorkingNowEntry[];
}

export interface WorkingNowLocation {
  title: string;
  onTheClock: WorkingNowSection;
  onBreak: WorkingNowSection | null;
  notInYet: WorkingNowSection | null;
}

export interface WorkingNowLeaveEntry {
  name: string;
  detail: string;
}

export interface WorkingNowSnapshot {
  locations: WorkingNowLocation[];
  onLeave: WorkingNowLeaveEntry[];
}

const ON_CLOCK_TITLE = /^On the clock \(\d+\)$/;
const ON_LEAVE_TITLE = /^On leave today \(\d+\)$/;
const SINCE_PATTERN =
  /^Since [A-Z][a-z]{2} \d{1,2}, \d{4} at \d{1,2}:\d{2} (?:AM|PM)(?: · .+)?$/;
const BREAK_PATTERN = /^(?:Paid|Unpaid) break since .+$/;
const LATE_PATTERN = /^\d+ min late · shift started .+$/;
const KNOWN_FLAG_LABELS = new Set<string>(
  Object.values(WORKING_NOW_FLAG_LABELS),
);

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Working now (Module 10). Read-only coverage for the live location groups,
 * on-the-clock/on-break/not-in-yet sections, flag badges, on-leave-today card,
 * empty state and the clock-out confirmation. Clocking an employee out is never
 * confirmed; only the dialog is opened, checked and cancelled.
 */
export class WorkingNowPage extends AppShellPage {
  readonly heading: Locator;
  readonly description: Locator;
  readonly emptyStateTitle: Locator;
  readonly emptyStateDescription: Locator;
  readonly locationCards: Locator;
  readonly onLeaveCard: Locator;
  readonly clockOutDialog: Locator;

  constructor(page: Page, options: ShellPageOptions = {}) {
    super(page, options);
    this.heading = this.main.getByRole('heading', {
      name: 'Working now',
      level: 1,
      exact: true,
    });
    this.description = this.main
      .getByText('Who is on the clock right now. Updates every minute.', {
        exact: true,
      })
      .first();
    this.emptyStateTitle = this.main.getByText('Nobody is on the clock', {
      exact: true,
    });
    this.emptyStateDescription = this.main.getByText(
      'People appear here when they clock in or are late for a scheduled shift.',
      { exact: true },
    );
    this.locationCards = this.main
      .locator('[data-slot="card"]')
      .filter({
        has: page.getByRole('heading', { name: ON_CLOCK_TITLE }),
      });
    this.onLeaveCard = this.main
      .locator('[data-slot="card"]')
      .filter({
        has: page.locator('[data-slot="card-title"]', {
          hasText: ON_LEAVE_TITLE,
        }),
      })
      .first();
    // Radix marks the page aria-hidden while the alert dialog is open, so the
    // confirmation is deliberately located from the page root rather than main.
    this.clockOutDialog = page.getByRole('alertdialog');
  }

  async goto(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/working-now'));
    await this.heading.waitFor({ state: 'visible', timeout: 30_000 });
    await this.waitForContent();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.description).toBeVisible();
    await this.waitForContent();
    await this.expectNoBrokenValues();
  }

  async snapshot(): Promise<WorkingNowSnapshot> {
    return {
      locations: await this.readLocations(),
      onLeave: await this.readOnLeaveToday(),
    };
  }

  async hasLocations(): Promise<boolean> {
    return (await this.locationCards.count()) > 0;
  }

  async hasOnLeave(): Promise<boolean> {
    return (await this.onLeaveCard.count()) > 0;
  }

  async firstClockOutEntry(): Promise<WorkingNowEntry | null> {
    for (const location of (await this.snapshot()).locations) {
      const entry = location.onTheClock.entries.find(
        (candidate) => candidate.clockOutLabel !== null,
      );

      if (entry) {
        return entry;
      }
    }

    return null;
  }

  async clockOutLabels(): Promise<string[]> {
    return this.clockOutButtons().evaluateAll((buttons) =>
      buttons
        .map((button) => button.getAttribute('aria-label') ?? '')
        .filter(Boolean),
    );
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyStateTitle).toBeVisible();
    await expect(this.emptyStateDescription).toBeVisible();
    await expect(this.locationCards).toHaveCount(0);
  }

  /**
   * Validates every rendered location card and its sections against a snapshot
   * so the counts, titles, row copy and flag labels cannot drift independently.
   */
  async expectSections(
    snapshot?: WorkingNowSnapshot,
  ): Promise<WorkingNowSnapshot> {
    const current = snapshot ?? (await this.snapshot());

    for (const location of current.locations) {
      expect(
        normalize(location.title),
        'Working-now location title',
      ).not.toBe('');

      this.expectSection(location.onTheClock, 'On the clock', {
        metaPattern: SINCE_PATTERN,
        clockOut: true,
        emptyCopy: 'Nobody right now.',
      });

      if (location.onBreak) {
        this.expectSection(location.onBreak, 'On break', {
          metaPattern: BREAK_PATTERN,
          clockOut: true,
        });
      }

      if (location.notInYet) {
        this.expectSection(location.notInYet, 'Not in yet', {
          metaPattern: LATE_PATTERN,
          clockOut: false,
        });
      }
    }

    await this.expectNoBrokenValues();

    return current;
  }

  async expectOnLeaveToday(
    entries?: WorkingNowLeaveEntry[],
  ): Promise<WorkingNowLeaveEntry[]> {
    const people = entries ?? (await this.snapshot()).onLeave;

    if (people.length === 0) {
      await expect(this.onLeaveCard).toHaveCount(0);
      return people;
    }

    await expect(this.onLeaveCard).toBeVisible();
    await expect(
      this.onLeaveCard.locator('[data-slot="card-title"]'),
      'On-leave card title',
    ).toHaveText(`On leave today (${people.length})`);

    for (const person of people) {
      expect(person.name, 'On-leave employee name').not.toBe('');
      expect(person.detail, 'On-leave detail').not.toBe('');
    }

    return people;
  }

  /** Opens the first clock-out confirmation and returns the employee name. */
  async openFirstClockOutDialog(): Promise<string> {
    const button = this.clockOutButtons().first();
    const label = await button.getAttribute('aria-label');

    if (!label) {
      throw new Error('Clock out button has no accessible name');
    }

    await button.click();
    await expect(this.clockOutDialog).toBeVisible();

    return label.replace(/^Clock out /, '');
  }

  async expectClockOutDialog(name: string): Promise<void> {
    await expect(this.clockOutDialog).toBeVisible();
    await expect(
      this.clockOutDialog.getByRole('heading', {
        name: `Clock out ${name}?`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(this.clockOutDialog).toContainText(
      'Their entry ends now and is marked as clocked out by you.',
    );
    await expect(
      this.clockOutDialog.getByRole('button', { name: 'Cancel', exact: true }),
    ).toBeVisible();
    await expect(
      this.clockOutDialog.getByRole('button', {
        name: 'Clock out',
        exact: true,
      }),
    ).toBeVisible();
  }

  async cancelClockOutDialog(): Promise<void> {
    await this.clockOutDialog
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await expect(this.clockOutDialog).toBeHidden();
  }

  async expectNoBrokenValues(): Promise<void> {
    await expect(this.main).not.toContainText(
      /NaN|undefined|Invalid Date/,
    );
  }

  private clockOutButtons(): Locator {
    return this.main.getByRole('button', { name: /^Clock out / });
  }

  private expectSection(
    section: WorkingNowSection,
    label: string,
    options: {
      metaPattern: RegExp;
      clockOut: boolean;
      emptyCopy?: string;
    },
  ): void {
    expect(section.title, `${label} section title`).toBe(
      `${label} (${section.count})`,
    );
    expect(
      section.entries.length,
      `${label} section count should match its rows`,
    ).toBe(section.count);

    if (section.count === 0) {
      if (options.emptyCopy) {
        expect(section.emptyCopy, `${label} empty copy`).toBe(
          options.emptyCopy,
        );
      }

      return;
    }

    for (const entry of section.entries) {
      expect(entry.name, `${label} employee name`).not.toBe('');
      expect(entry.meta, `${label} copy for ${entry.name}`).toMatch(
        options.metaPattern,
      );

      for (const flag of entry.flags) {
        expect(
          KNOWN_FLAG_LABELS.has(flag),
          `Unknown working-now flag label: "${flag}"`,
        ).toBe(true);
      }

      if (options.clockOut) {
        expect(
          entry.clockOutLabel,
          `${label} clock-out action for ${entry.name}`,
        ).toBe(`Clock out ${entry.name}`);
      } else {
        expect(
          entry.clockOutLabel,
          `${label} should not offer a clock-out action`,
        ).toBeNull();
      }
    }
  }

  private async waitForContent(): Promise<void> {
    await expect
      .poll(
        async () =>
          (await this.locationCards.count()) > 0 ||
          (await this.emptyStateTitle.isVisible()),
        {
          message: 'Expected working-now location cards or the empty state',
        },
      )
      .toBe(true);

    await this.waitForSkeletonsToClear();
  }

  private async readLocations(): Promise<WorkingNowLocation[]> {
    const locations = await this.locationCards.evaluateAll((cards) => {
      const readText = (element: Element | null): string =>
        (element?.textContent ?? '').replace(/\s+/g, ' ').trim();

      const readSection = (heading: Element) => {
        const title = readText(heading);
        const match = title.match(/^(.+?) \((\d+)\)$/);
        const wrapper = heading.parentElement;
        const list = wrapper?.querySelector(':scope > ul') ?? null;
        const emptyCopy = readText(
          wrapper?.querySelector(':scope > p') ?? null,
        );
        const entries = Array.from(
          list?.querySelectorAll(':scope > li') ?? [],
        ).map((item) => {
          const name = readText(item.querySelector('p'));
          const metaElement = item.querySelector('p')?.nextElementSibling;
          let meta = '';

          if (metaElement) {
            const clone = metaElement.cloneNode(true) as Element;

            clone
              .querySelectorAll('[data-slot="badge"]')
              .forEach((badge) => badge.remove());
            meta = readText(clone);
          }

          const flags = Array.from(
            item.querySelectorAll('[data-slot="badge"]'),
          ).map((badge) => readText(badge));
          const clockOut = item.querySelector(
            'button[aria-label^="Clock out "]',
          );

          return {
            name,
            meta,
            flags,
            clockOutLabel: clockOut?.getAttribute('aria-label') ?? null,
          };
        });

        return {
          title,
          count: match ? Number(match[2]) : entries.length,
          emptyCopy,
          entries,
        };
      };

      return cards.map((card) => {
        const sections = Array.from(card.querySelectorAll('h3')).map(
          readSection,
        );
        const findSection = (prefix: string) =>
          sections.find((section) =>
            section.title.startsWith(`${prefix} (`),
          ) ?? null;

        return {
          title: readText(card.querySelector('[data-slot="card-title"]')),
          onTheClock: findSection('On the clock'),
          onBreak: findSection('On break'),
          notInYet: findSection('Not in yet'),
        };
      });
    });

    return locations.map((location) => {
      if (!location.onTheClock) {
        throw new Error(
          `Location card "${location.title}" has no On the clock section`,
        );
      }

      return {
        title: location.title,
        onTheClock: location.onTheClock,
        onBreak: location.onBreak,
        notInYet: location.notInYet,
      };
    });
  }

  private async readOnLeaveToday(): Promise<WorkingNowLeaveEntry[]> {
    if ((await this.onLeaveCard.count()) === 0) {
      return [];
    }

    return this.onLeaveCard.evaluate((card) => {
      const readText = (element: Element | null): string =>
        (element?.textContent ?? '').replace(/\s+/g, ' ').trim();

      return Array.from(card.querySelectorAll('ul > li')).map((item) => {
        const name = readText(item.querySelector('p'));

        return {
          name,
          detail: readText(item.querySelector('p')?.nextElementSibling ?? null),
        };
      });
    });
  }
}
