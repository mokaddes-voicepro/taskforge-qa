import { test, expect } from '../fixtures/pages.fixture';

const DURATION_PATTERN = /^(?:\d+h(?:\s*\d+m)?|\d+m)$/;

/**
 * Module 5 — Time Clock.
 *
 * Read-only coverage: live clock/date, current clock state, off-clock action,
 * project picker, today summary and the weekly chart. Clock in/out, breaks and
 * job switching are intentionally out of scope because they mutate the shared
 * workspace and the owner's time entry.
 *
 * Run: npm run test:modules:chrome -- tests/05-time-clock.spec.ts
 */
test.describe('Time clock (Module 5)', () => {
  test('loads the time clock with live time, date and status', async ({
    timeClockPage,
  }) => {
    await timeClockPage.goto();

    await timeClockPage.expectTitle(/Time clock .+ TaskForge/i);
    await timeClockPage.expectPath(timeClockPage.workspaceHref('/time-clock'));
    await timeClockPage.expectLoaded();
  });

  test('shows the off-clock action, timer and location notice', async ({
    timeClockPage,
  }) => {
    await timeClockPage.goto();

    test.skip(
      !(await timeClockPage.isOffClock()),
      'The owner is currently clocked in; the off-clock state is not applicable.',
    );

    await timeClockPage.expectOffClockState();
    await expect(timeClockPage.locationNotice).toBeVisible();
    await expect(timeClockPage.timer).toHaveText('0:00:00');
    await timeClockPage.expectNoBrokenValues();
  });

  test('lists project options and restores the No project selection', async ({
    timeClockPage,
  }) => {
    await timeClockPage.goto();

    test.skip(
      !(await timeClockPage.isOffClock()),
      'Changing the project while clocked in would switch jobs.',
    );

    const entriesBefore = await timeClockPage.todayEntries();

    await timeClockPage.openProjectPicker();

    const options = await timeClockPage.projectOptions();
    const project = options.find((option) => option !== 'No project');

    expect(options, 'Project picker should always include No project').toContain(
      'No project',
    );

    if (!project) {
      await timeClockPage.closeProjectPicker();
      test.skip(true, 'The workspace has no project to assign.');
      return;
    }

    await timeClockPage.selectProject(project);
    await timeClockPage.expectProject(project);

    await timeClockPage.selectProject('No project');
    await timeClockPage.expectProject('No project');

    expect(
      await timeClockPage.todayEntries(),
      'Selecting a project must not create a time entry',
    ).toBe(entriesBefore);
    await timeClockPage.expectNoBrokenValues();
  });

  test("shows today's worked time, entry count and empty state", async ({
    timeClockPage,
  }) => {
    await timeClockPage.goto();

    await timeClockPage.expectTodayCard();

    const entries = await timeClockPage.todayEntries();

    expect(entries, 'Today entry count').toBeGreaterThanOrEqual(0);
    expect(await timeClockPage.todayWorked()).toMatch(DURATION_PATTERN);

    if (entries === 0) {
      await timeClockPage.expectTodayEmpty();
    } else {
      await expect(timeClockPage.todayEmptyMessage).toBeHidden();
    }

    await timeClockPage.expectNoBrokenValues();
  });

  test('shows the weekly total and seven-day chart', async ({
    timeClockPage,
  }) => {
    await timeClockPage.goto();

    await timeClockPage.expectWeekCard();

    expect(await timeClockPage.weekTotal()).toMatch(DURATION_PATTERN);
    await expect(timeClockPage.weekChart).toBeVisible();
    await timeClockPage.expectNoBrokenValues();
  });
});
