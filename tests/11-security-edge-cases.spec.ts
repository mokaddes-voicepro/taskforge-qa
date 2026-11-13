import { test, expect } from '../fixtures/pages.fixture';
import type { Locator } from '@playwright/test';
import { env } from '../utils/env';
import { LoginPage } from '../pages/LoginPage';
import { WorkspacePage } from '../pages/WorkspacePage';
import { TasksPage } from '../pages/TasksPage';
import { AnnouncementsPage } from '../pages/AnnouncementsPage';
import { LaborCostPage } from '../pages/LaborCostPage';
import { NotificationsPage } from '../pages/NotificationsPage';

/**
 * Cross-cutting security, responsive and realtime edge cases.
 *
 * Read-only coverage for the non-functional and security scenarios that cut
 * across module boundaries:
 *
 * - `SEC-01` / `GEN-07` — unauthenticated deep links redirect to the login page
 *   without rendering workspace content.
 * - `SEC-05` — script/HTML injection payloads placed in search bars and
 *   unsubmitted form inputs stay inert (no script execution, no dialogs).
 * - `SEC-06` — CSV export controls are safe download links and spreadsheet
 *   formula injection prefixes stay inert in search inputs.
 * - `NFR-03` / `GEN-08` — responsive checks at 375px (mobile: no horizontal
 *   overflow, 44px tap targets) and 1440px (desktop: no horizontal overflow).
 * - `NFR-08` — realtime degradation on the unreachable host renders the
 *   reconnecting banner gracefully without unhandled page errors.
 *
 * No destructive, submitting or data-mutating action is performed: dialogs are
 * cancelled, searches are cleared and exports are only inspected.
 *
 * Run: npm run test:modules:chrome -- tests/11-security-edge-cases.spec.ts
 */

/** HTML/script payloads that must never execute when typed into inputs. */
const XSS_SCRIPT = '<script>alert(1)</script>';
const XSS_IMAGE = '<img src=x onerror="window.__taskforgeXssFired = true">';

/** Spreadsheet formula prefixes that must stay inert text. */
const FORMULA_PAYLOADS = ['=1+1', "=cmd|'/C calc'!A0", '@SUM(1)', '+1', '-1'];

/** Mobile viewport required by the responsive checks (NFR-03). */
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MIN_TAP_TARGET_HEIGHT = 44;

/** The shell controls verified for mobile tap-target size. */
interface ShellControls {
  notificationsButton: Locator;
  accountMenuButton: Locator;
  createButton: Locator;
  searchButton: Locator;
}

/** Pages checked for responsive rendering. */
type ResponsiveCheckPage = ShellControls & {
  goto(): Promise<void>;
  expectNoHorizontalOverflow(): Promise<void>;
};

test.describe('Cross-cutting Security, Responsive & Edge Cases', () => {
  test('SEC-01/GEN-07: unauthenticated deep links redirect to the login page', async ({
    browser,
  }) => {
    const context = await browser.newContext({ baseURL: env.baseURL });
    // Module projects inject the saved storage state, so a fresh context must
    // be explicitly cleared to stay anonymous for the route-protection checks.
    await context.clearCookies();
    const page = await context.newPage();
    const loginPage = new LoginPage(page);
    const workspacePage = new WorkspacePage(page);

    const deepLinks = [
      env.workspacePath,
      `${env.workspacePath}/tasks`,
      `${env.workspacePath}/leave`,
      `${env.workspacePath}/reports/labor-cost`,
      `${env.workspacePath}/settings`,
      `${env.workspacePath}/chat`,
    ];

    for (const path of deepLinks) {
      await workspacePage.goto(path);
      await workspacePage.expectLoggedOut();
      await loginPage.expectVisible();
      await expect(loginPage.heading, `Login heading for ${path}`).toBeVisible();
    }

    await context.close();
  });

  test('SEC-05: script injection payloads in search and unsubmitted inputs stay inert', async ({
    tasksPage,
    announcementsPage,
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    const dialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });

    await tasksPage.goto();
    await tasksPage.expectLoaded();
    await tasksPage.searchFor('<script>alert(1)</script>');
    await tasksPage.clearSearch();
    await tasksPage.expectNoBrokenValues();

    await announcementsPage.goto();
    await announcementsPage.expectLoaded();
    await announcementsPage.openNewAnnouncementDialog();
    await announcementsPage.expectNewAnnouncementDialog();
    await announcementsPage.dialog.getByLabel('Title').fill('<script>alert(1)</script>');
    await announcementsPage.dialog.getByLabel('Message').fill(
      '<img src=x onerror="window.__taskforgeXssFired = true">',
    );
    await announcementsPage.cancelNewAnnouncementDialog();
    await expect(announcementsPage.dialog).toBeHidden();

    expect(
      pageErrors,
      'Injected payloads must not trigger unhandled page errors',
    ).toHaveLength(0);
    expect(
      dialogs,
      'Injected payloads must not open any dialog',
    ).toHaveLength(0);
  });

  test('SEC-06: CSV export is a safe download link and formula payloads stay inert', async ({
    laborCostPage,
    tasksPage,
  }) => {
    await laborCostPage.goto();
    await laborCostPage.expectLoaded();

    const exportUrl = await laborCostPage.exportUrl();

    expect(
      exportUrl.pathname,
      'Labor cost CSV export must target the labor cost export endpoint',
    ).toMatch(/\/reports\/labor-cost[^/]*\.csv$/);

    const exportHref = await laborCostPage.exportLink.getAttribute('href');
    expect(
      String(exportHref ?? ''),
      'The CSV export control must not be a script URL',
    ).not.toMatch(/^javascript:/i);
    expect(
      String(exportHref ?? ''),
      'The CSV export control must not be a data-URL document',
    ).not.toMatch(/^data:text\/html/i);

    for (const payload of FORMULA_PAYLOADS) {
      await tasksPage.goto();
      await tasksPage.expectLoaded();
      await tasksPage.searchFor(payload);
      await tasksPage.clearSearch();
      await tasksPage.expectNoBrokenValues();
    }
  });

  test('NFR-08: realtime degradation on the unreachable host stays graceful', async ({
    tasksPage,
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await tasksPage.goto();
    const taskStatus = await tasksPage.expectRealtimeStatusReported();

    expect(
      taskStatus ?? '',
      'Realtime status should describe the paused/reconnecting transport',
    ).toMatch(/reconnecting|paused|offline/i);

    expect(
      pageErrors,
      'Realtime degradation must not crash the page or raise page errors',
    ).toHaveLength(0);
  });

  test('NFR-03/GEN-08: mobile viewport avoids horizontal overflow and keeps 44px tap targets', async ({
    page,
    tasksPage,
    notificationsPage,
    chatPage,
    announcementsPage,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);

    const checkTargets: ResponsiveCheckPage[] = [
      tasksPage as unknown as ResponsiveCheckPage,
      notificationsPage as unknown as ResponsiveCheckPage,
      chatPage as unknown as ResponsiveCheckPage,
      announcementsPage as unknown as ResponsiveCheckPage,
    ];

    for (const target of checkTargets) {
      await target.goto();
      await target.expectNoHorizontalOverflow();

      const buttons: Array<{ name: string; locator: Locator }> = [
        { name: 'Notifications', locator: target.notificationsButton },
        { name: 'Account menu', locator: target.accountMenuButton },
        { name: 'Create', locator: target.createButton },
        { name: 'Search', locator: target.searchButton },
      ];

      for (const button of buttons) {
        const box = await button.locator.boundingBox();
        expect(
          box,
          `Shell control "${button.name}" should render a bounding box at the mobile viewport`,
        ).not.toBeNull();
        expect(
          box?.height ?? 0,
          `Shell control "${button.name}" should keep a 44px tap target on mobile`,
        ).toBeGreaterThanOrEqual(MIN_TAP_TARGET_HEIGHT);
      }
    }
  });

  test('NFR-03/GEN-08: desktop viewport avoids horizontal overflow on core pages', async ({
    page,
    tasksPage,
    notificationsPage,
    announcementsPage,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);

    const checkTargets: ResponsiveCheckPage[] = [
      tasksPage as unknown as ResponsiveCheckPage,
      notificationsPage as unknown as ResponsiveCheckPage,
      announcementsPage as unknown as ResponsiveCheckPage,
    ];

    for (const target of checkTargets) {
      await target.goto();
      await target.expectNoHorizontalOverflow();
    }
  });
});
