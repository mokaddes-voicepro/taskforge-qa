import { test, expect } from '../fixtures/pages.fixture';
import { addDays } from '../pages/SchedulePage';

/**
 * Module 4 — Schedule.
 *
 * Read-only coverage: weekly grid, week navigation, My shifts, department and
 * office filters, publish gating and the Add shift draft dialog. Creating,
 * copying, discarding or publishing shifts is intentionally out of scope
 * because it mutates the shared workspace.
 *
 * Run: npm run test:modules:chrome -- tests/04-schedule.spec.ts
 */
test.describe('Schedule (Module 4)', () => {
  test('loads the weekly schedule with toolbar, seven day columns and employee rows', async ({
    schedulePage,
  }) => {
    await schedulePage.goto();

    await schedulePage.expectTitle(/Schedule .+ TaskForge/i);
    await schedulePage.expectPath(schedulePage.workspaceHref('/schedule'));
    await schedulePage.expectLoaded();

    const range = await schedulePage.weekRange();

    expect(
      range.end.getTime() - range.start.getTime(),
      'Schedule week should span seven days',
    ).toBe(6 * 86_400_000);
  });

  test('navigates by whole weeks and returns to the current week', async ({
    schedulePage,
  }) => {
    await schedulePage.goto();

    const currentLabel = await schedulePage.weekLabelText();
    const currentRange = await schedulePage.weekRange();
    const currentEmployees = await schedulePage.employeeRows();

    await schedulePage.nextWeek();
    await schedulePage.expectWeekStarts(addDays(currentRange.start, 7));
    await schedulePage.expectWeekGrid();
    expect(await schedulePage.employeeRows()).toEqual(currentEmployees);

    await schedulePage.nextWeek();
    await schedulePage.expectWeekStarts(addDays(currentRange.start, 14));
    await schedulePage.expectWeekGrid();

    await schedulePage.previousWeek();
    await schedulePage.expectWeekStarts(addDays(currentRange.start, 7));
    await schedulePage.expectWeekGrid();

    await schedulePage.goToThisWeek(currentLabel);
    await schedulePage.expectWeekStarts(currentRange.start);
    await schedulePage.expectWeekGrid();
    expect(await schedulePage.employeeRows()).toEqual(currentEmployees);

    await schedulePage.expectPath(schedulePage.workspaceHref('/schedule'));
  });

  test('toggles My shifts and shows the personal empty state', async ({
    schedulePage,
  }) => {
    await schedulePage.goto();

    const allEmployees = await schedulePage.employeeRows();

    await schedulePage.expectMyShifts(false);
    await schedulePage.toggleMyShifts();
    await schedulePage.expectMyShifts(true);

    const personalEmployees = await schedulePage.employeeRows();

    if (await schedulePage.myShiftsEmptyMessage.isVisible()) {
      await schedulePage.expectMyShiftsEmpty();
      expect(personalEmployees, 'My shifts should hide other employees').toHaveLength(
        0,
      );
    } else {
      expect(personalEmployees.length).toBeGreaterThan(0);
      expect(personalEmployees.length).toBeLessThanOrEqual(allEmployees.length);
    }

    await schedulePage.toggleMyShifts();
    await schedulePage.expectMyShifts(false);
    expect(await schedulePage.employeeRows()).toEqual(allEmployees);
    await schedulePage.expectNoBrokenValues();
  });

  test('filters employees by department and restores them when cleared', async ({
    schedulePage,
  }) => {
    await schedulePage.goto();

    const allEmployees = await schedulePage.employeeRows();

    await schedulePage.expectFilterCount('Departments', 0);
    await schedulePage.selectFirstFilterOption('Departments');
    await schedulePage.expectFilterCount('Departments', 1);

    const filteredEmployees = await schedulePage.employeeRows();

    expect(filteredEmployees.length).toBeGreaterThan(0);
    expect(filteredEmployees.length).toBeLessThanOrEqual(allEmployees.length);
    await schedulePage.expectWeekGrid();

    await schedulePage.deselectFirstFilterOption('Departments');
    await schedulePage.expectFilterCount('Departments', 0);
    expect(await schedulePage.employeeRows()).toEqual(allEmployees);
    await schedulePage.expectWeekGrid();
  });

  test('exposes department and office filter options', async ({
    schedulePage,
  }) => {
    await schedulePage.goto();

    await schedulePage.expectFilterOptionSets();
    await schedulePage.expectNoBrokenValues();
  });

  test('opens the Add shift draft dialog with defaults and cancels cleanly', async ({
    schedulePage,
  }) => {
    await schedulePage.goto();

    const shiftCardsBefore = await schedulePage.shiftCardCount();

    await schedulePage.openAddShiftDialog();
    await schedulePage.expectAddShiftDialog();
    await schedulePage.cancelAddShiftDialog();

    expect(
      await schedulePage.shiftCardCount(),
      'Cancelling the dialog must not create a shift',
    ).toBe(shiftCardsBefore);

    if (shiftCardsBefore === 0) {
      await schedulePage.expectPublishControlsGated();
    }

    await schedulePage.expectNoBrokenValues();
  });

  test('gates publish and discard controls when there are no drafts', async ({
    schedulePage,
  }) => {
    await schedulePage.goto();

    test.skip(
      !(await schedulePage.discardDraftsButton.isDisabled()),
      'Draft shifts exist; publish gating will be covered once drafts are seeded.',
    );

    await expect(schedulePage.copyLastWeekButton).toBeEnabled();
    await schedulePage.expectPublishControlsGated();
  });

  test('renders an empty schedule with zero hours and no broken values', async ({
    schedulePage,
  }) => {
    await schedulePage.goto();

    test.skip(
      await schedulePage.hasScheduledShifts(),
      'The schedule now has shifts; the empty-schedule checks are not applicable.',
    );

    await schedulePage.expectEmptySchedule();
    await schedulePage.expectWeekGrid();
    await schedulePage.expectEmployeeRows();
  });
});
