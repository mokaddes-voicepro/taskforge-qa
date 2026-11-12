import { test as authTest } from './auth.fixture';
import { CalendarPage } from '../pages/CalendarPage';
import { HomePage } from '../pages/HomePage';
import { LaborCostPage } from '../pages/LaborCostPage';
import { LeavePage } from '../pages/LeavePage';
import { SchedulePage } from '../pages/SchedulePage';
import { TasksPage } from '../pages/TasksPage';
import { TimeClockPage } from '../pages/TimeClockPage';
import { TimesheetsPage } from '../pages/TimesheetsPage';
import { restoreSessionCookies } from '../utils/auth';

interface PageFixtures {
  homePage: HomePage;
  tasksPage: TasksPage;
  calendarPage: CalendarPage;
  schedulePage: SchedulePage;
  leavePage: LeavePage;
  laborCostPage: LaborCostPage;
  timeClockPage: TimeClockPage;
  timesheetsPage: TimesheetsPage;
}

/**
 * Module-spec fixtures. Auth fixtures remain available, and storageState is
 * supplied by the Playwright `modules-*` projects. Page objects receive a
 * session-restore hook so a transient /login redirect can be recovered without
 * repeating UI login.
 */
export const test = authTest.extend<PageFixtures>({
  homePage: async ({ page, context, authStoragePath }, use) => {
    await use(
      new HomePage(page, {
        restoreSession: () => restoreSessionCookies(context, authStoragePath),
      }),
    );
  },
  tasksPage: async ({ page, context, authStoragePath }, use) => {
    await use(
      new TasksPage(page, {
        restoreSession: () => restoreSessionCookies(context, authStoragePath),
      }),
    );
  },
  calendarPage: async ({ page, context, authStoragePath }, use) => {
    await use(
      new CalendarPage(page, {
        restoreSession: () => restoreSessionCookies(context, authStoragePath),
      }),
    );
  },
  schedulePage: async ({ page, context, authStoragePath }, use) => {
    await use(
      new SchedulePage(page, {
        restoreSession: () => restoreSessionCookies(context, authStoragePath),
      }),
    );
  },
  leavePage: async ({ page, context, authStoragePath }, use) => {
    await use(
      new LeavePage(page, {
        restoreSession: () => restoreSessionCookies(context, authStoragePath),
      }),
    );
  },
  laborCostPage: async ({ page, context, authStoragePath }, use) => {
    await use(
      new LaborCostPage(page, {
        restoreSession: () => restoreSessionCookies(context, authStoragePath),
      }),
    );
  },
  timeClockPage: async ({ page, context, authStoragePath }, use) => {
    await use(
      new TimeClockPage(page, {
        restoreSession: () => restoreSessionCookies(context, authStoragePath),
      }),
    );
  },
  timesheetsPage: async ({ page, context, authStoragePath }, use) => {
    await use(
      new TimesheetsPage(page, {
        restoreSession: () => restoreSessionCookies(context, authStoragePath),
      }),
    );
  },
});

export { expect } from './auth.fixture';
