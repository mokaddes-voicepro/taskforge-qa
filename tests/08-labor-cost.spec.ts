import { test, expect } from '../fixtures/pages.fixture';
import {
  addDays,
  currentMonthDay,
  currentMonthRange,
  currentWeekStart,
} from '../pages/LaborCostPage';

/**
 * Module 8 — Labor cost.
 *
 * Read-only coverage: the report shell and export link, date-range presets,
 * custom date pickers, Employee/Project/Department/Office grouping, the
 * Department/Office/Project filters, the Approved-only toggle, empty states and
 * the result table totals. Exporting is checked through the CSV link's query
 * only; no download is started and no workspace data is changed.
 *
 * Run: npm run test:modules:chrome -- tests/08-labor-cost.spec.ts
 */
test.describe('Labor cost (Module 8)', () => {
  test('loads the report shell with the current week and export link', async ({
    laborCostPage,
  }) => {
    await laborCostPage.goto();

    await laborCostPage.expectTitle(/Labor cost .+ TaskForge/i);
    await laborCostPage.expectPath(
      laborCostPage.workspaceHref('/reports/labor-cost'),
    );
    await laborCostPage.expectLoaded();

    const range = await laborCostPage.rangeDates();
    const weekStart = currentWeekStart();

    expect(range.start.getUTCDay(), 'Labor cost week starts Monday').toBe(1);
    expect(range.start.getTime(), 'Current labor cost week start').toBe(
      weekStart.getTime(),
    );
    expect(range.end.getTime(), 'Current labor cost week end').toBe(
      addDays(weekStart, 6).getTime(),
    );

    await laborCostPage.expectRange('This week');
    await laborCostPage.expectGroup('Employee');
    await laborCostPage.expectApprovedOnly(false);
    await laborCostPage.expectExport({
      start: weekStart,
      end: addDays(weekStart, 6),
      group: 'Employee',
      approvedOnly: false,
    });
    await laborCostPage.expectEmptyOrResults();
    await laborCostPage.expectNoBrokenValues();
  });

  test('offers preset ranges and keeps labels and export dates in sync', async ({
    laborCostPage,
  }) => {
    await laborCostPage.goto();
    await laborCostPage.expectRangeOptions();

    const thisWeek = await laborCostPage.rangeDates();
    const previousStart = addDays(thisWeek.start, -7);
    const previousEnd = addDays(thisWeek.start, -1);
    const month = currentMonthRange();

    const cases = [
      { range: 'Last week', start: previousStart, end: previousEnd },
      { range: 'This pay period', start: thisWeek.start, end: thisWeek.end },
      {
        range: 'Last pay period',
        start: previousStart,
        end: previousEnd,
      },
      { range: 'This month', start: month.start, end: month.end },
      { range: 'This week', start: thisWeek.start, end: thisWeek.end },
    ] as const;

    for (const item of cases) {
      await laborCostPage.selectRange(item.range);
      await laborCostPage.expectRange(item.range);
      await laborCostPage.expectRangeDates(item.start, item.end);
      await laborCostPage.expectExport({
        start: item.start,
        end: item.end,
        group: 'Employee',
      });
      await laborCostPage.expectNoBrokenValues();
    }
  });

  test('renders each grouping with the matching columns and totals', async ({
    laborCostPage,
  }) => {
    await laborCostPage.goto();
    await laborCostPage.expectGroupOptions();

    const hasData = await laborCostPage.ensureRangeWithData();

    test.skip(
      !hasData,
      'No labor cost hours are available for the preset ranges or current month.',
    );

    for (const group of [
      'Project',
      'Department',
      'Office',
      'Employee',
    ] as const) {
      await laborCostPage.selectGroup(group);
      await laborCostPage.expectResults(group);
      await laborCostPage.expectExport({ group });
    }

    expect(
      await laborCostPage.firstRowLabel(),
      'The grouped table should name its first row',
    ).not.toBe('');
    await laborCostPage.expectNoBrokenValues();
  });

  test('applies and clears department and project filters', async ({
    laborCostPage,
  }) => {
    await laborCostPage.goto();
    await laborCostPage.expectFilterOptionSets();

    await laborCostPage.expectFilterCount('Department', 0);
    await laborCostPage.selectFirstFilterOption('Department');
    await laborCostPage.expectFilterCount('Department', 1);
    await laborCostPage.expectFilterInExport('Department', true);

    await laborCostPage.selectFirstFilterOption('Project');
    await laborCostPage.expectFilterCount('Project', 1);
    await laborCostPage.expectFilterInExport('Project', true);

    await laborCostPage.deselectFirstFilterOption('Project');
    await laborCostPage.expectFilterCount('Project', 0);
    await laborCostPage.expectFilterInExport('Project', false);

    await laborCostPage.deselectFirstFilterOption('Department');
    await laborCostPage.expectFilterCount('Department', 0);
    await laborCostPage.expectFilterInExport('Department', false);

    await laborCostPage.expectNoBrokenValues();
  });

  test('toggles Approved only and syncs the export query', async ({
    laborCostPage,
  }) => {
    await laborCostPage.goto();
    await laborCostPage.selectRange('Last week');

    await laborCostPage.expectApprovedOnly(false);
    await laborCostPage.expectExport({ approvedOnly: false });

    await laborCostPage.toggleApprovedOnly();
    await laborCostPage.expectApprovedOnly(true);
    await laborCostPage.expectExport({ approvedOnly: true });

    await laborCostPage.toggleApprovedOnly();
    await laborCostPage.expectApprovedOnly(false);
    await laborCostPage.expectExport({ approvedOnly: false });

    await laborCostPage.expectNoBrokenValues();
  });

  test('supports a custom range with date pickers and an updated export', async ({
    laborCostPage,
  }) => {
    await laborCostPage.goto();

    const start = currentMonthRange().start;
    const end = currentMonthDay(15);

    await laborCostPage.selectRange('Custom');
    await laborCostPage.expectRange('Custom');
    await laborCostPage.expectCustomPending();
    await laborCostPage.expectExportUnavailable();

    await laborCostPage.pickCustomDate('from', start);
    await laborCostPage.expectCustomDate('from', start);
    await laborCostPage.expectCustomPending();
    await laborCostPage.expectExportUnavailable();

    await laborCostPage.pickCustomDate('to', end);
    await laborCostPage.expectCustomDate('to', end);
    await laborCostPage.expectExportAvailable();
    await laborCostPage.expectExport({
      start,
      end,
      group: 'Employee',
    });
    await laborCostPage.expectEmptyOrResults();
    await laborCostPage.expectNoBrokenValues();
  });
});
