import { test, expect } from '../fixtures/pages.fixture';
import {
  addDays,
  shiftMonthLabel,
} from '../pages/LeavePage';

/**
 * Module 7 — Leave.
 *
 * Read-only coverage: balance cards, personal and team request queues, the
 * monthly leave calendar, and the Request leave dialog defaults, options,
 * length control and date-range validation. Submitting, approving, rejecting or
 * cancelling leave is intentionally out of scope because it mutates the shared
 * workspace. Selecting dates calls the dialog's non-mutating preview endpoint,
 * and every dialog is cancelled without sending a request.
 *
 * Run: npm run test:modules:chrome -- tests/07-leave.spec.ts
 */
test.describe('Leave (Module 7)', () => {
  test('loads balance cards, tabs and the personal requests section', async ({
    leavePage,
  }) => {
    await leavePage.goto();

    await leavePage.expectTitle(/Leave .+ TaskForge/i);
    await leavePage.expectPath(leavePage.workspaceHref('/leave'));
    await leavePage.expectLoaded();

    await leavePage.expectBalances();
    await expect(
      leavePage.balanceCards(),
      'Four leave types should be summarised',
    ).toHaveCount(4);

    if (await leavePage.emptyRequestsMessage.isVisible()) {
      await leavePage.expectEmptyRequests();
    }

    await leavePage.expectNoBrokenValues();
  });

  test('syncs My leave, Requests and Calendar tabs with the URL', async ({
    leavePage,
  }) => {
    await leavePage.goto();

    await leavePage.expectTab('mine');
    await expect(leavePage.balanceSection).toBeVisible();

    await leavePage.selectTab('requests');
    await leavePage.expectStatusFilter();
    await expect(leavePage.balanceSection).toBeHidden();

    await leavePage.selectTab('calendar');
    await leavePage.expectMonthGrid();
    await expect(leavePage.balanceSection).toBeHidden();

    await leavePage.selectTab('mine');
    await expect(leavePage.balanceSection).toBeVisible();

    await leavePage.expectPath(leavePage.workspaceHref('/leave'));
    await leavePage.expectNoBrokenValues();
  });

  test('lists request status filters and the team request queue state', async ({
    leavePage,
  }) => {
    await leavePage.goto();
    await leavePage.selectTab('requests');

    await leavePage.expectStatusFilter('Pending');
    await leavePage.expectStatusOptions();

    await leavePage.selectStatus('Approved');
    await leavePage.expectStatusFilter('Approved');

    await leavePage.selectStatus('All');
    await leavePage.expectStatusFilter('All');

    if (await leavePage.queueEmptyMessage.isVisible()) {
      await leavePage.expectQueueEmpty();
    }

    await leavePage.selectStatus('Pending');
    await leavePage.expectStatusFilter('Pending');
    await leavePage.expectNoBrokenValues();
  });

  test('navigates the leave calendar by month and returns to today', async ({
    leavePage,
  }) => {
    await leavePage.goto();
    await leavePage.selectTab('calendar');

    const currentLabel = await leavePage.monthLabel();

    await leavePage.expectMonthGrid();
    await leavePage.expectCalendarLegend();
    await leavePage.expectTodayHighlighted();

    await leavePage.nextMonth();
    await leavePage.expectMonthLabel(shiftMonthLabel(currentLabel, 1));
    await leavePage.expectMonthGrid();

    await leavePage.previousMonth();
    await leavePage.expectMonthLabel(currentLabel);
    await leavePage.expectMonthGrid();
    await leavePage.expectTodayHighlighted();

    await leavePage.nextMonth();
    await leavePage.expectMonthLabel(shiftMonthLabel(currentLabel, 1));

    await leavePage.goToToday(currentLabel);
    await leavePage.expectMonthLabel(currentLabel);
    await leavePage.expectMonthGrid();
    await leavePage.expectTodayHighlighted();

    await leavePage.expectNoBrokenValues();
  });

  test('opens the Request leave dialog with defaults and cancels cleanly', async ({
    leavePage,
  }) => {
    await leavePage.goto();

    const balancesBefore = await leavePage.balanceSectionText();
    const requestsBefore = await leavePage.requestsSectionText();

    await leavePage.openRequestLeaveDialog();
    await leavePage.expectRequestLeaveDialog();
    await leavePage.expectForOptions();
    await leavePage.expectTypeOptions();
    await leavePage.cancelRequestLeaveDialog();

    expect(
      await leavePage.balanceSectionText(),
      'Cancelling the dialog must not change leave balances',
    ).toBe(balancesBefore);
    expect(
      await leavePage.requestsSectionText(),
      'Cancelling the dialog must not create a leave request',
    ).toBe(requestsBefore);

    await leavePage.expectNoBrokenValues();
  });

  test('validates the date range and length without sending the request', async ({
    leavePage,
  }) => {
    await leavePage.goto();

    const balancesBefore = await leavePage.balanceSectionText();
    const requestsBefore = await leavePage.requestsSectionText();

    await leavePage.openRequestLeaveDialog();
    await leavePage.expectRequestLeaveDialog();

    await leavePage.selectType('Vacation');
    await leavePage.expectSendDisabled();

    const start = await leavePage.pickWeekdayInFollowingMonth('start', 15);

    await leavePage.expectLengthOptions();
    await leavePage.expectLength('Full day');
    await leavePage.expectSendEnabled();
    expect(await leavePage.endDate(), 'Last day should follow the first').toEqual(
      start,
    );
    await leavePage.expectSummaryDuration(/^1 day$/);
    await leavePage.expectSummaryBalance();

    await leavePage.selectLength('Morning only');
    await leavePage.expectSummaryDuration(/^0\.5 days$/);
    await leavePage.expectSummaryBalance();

    await leavePage.selectLength('Full day');
    await leavePage.expectSummaryDuration(/^1 day$/);

    await leavePage.pickDate('end', addDays(start, -1));
    await leavePage.expectEndBeforeStartError();

    await leavePage.pickDate('end', addDays(start, 2));
    await leavePage.expectRangeAccepted();
    await leavePage.expectSummaryDuration(/^3 days$/);
    await leavePage.expectSummaryBalance();

    if (!(await leavePage.lengthControlIsVisible())) {
      test.info().annotations.push({
        type: 'known-issue',
        description:
          'QA-013: after correcting an end-before-start range, the Request leave dialog leaves the Length control hidden while Send request is enabled.',
      });
    }

    await leavePage.fillReason();
    await leavePage.clearReason();
    await leavePage.cancelRequestLeaveDialog();

    expect(
      await leavePage.balanceSectionText(),
      'Cancelling the dialog must not change leave balances',
    ).toBe(balancesBefore);
    expect(
      await leavePage.requestsSectionText(),
      'Cancelling the dialog must not create a leave request',
    ).toBe(requestsBefore);

    await leavePage.expectNoBrokenValues();
  });
});
