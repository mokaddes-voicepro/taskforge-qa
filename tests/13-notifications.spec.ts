import { test, expect } from '../fixtures/pages.fixture';

/**
 * Module 13 — Notifications.
 *
 * Read-only coverage for the notification list, All/Unread tabs and empty state.
 * Mark all read is checked while disabled because there are no unread
 * notifications; it is never clicked.
 *
 * Run: npm run test:modules:chrome -- tests/13-notifications.spec.ts
 */
test.describe('Notifications (Module 13)', () => {
  test('loads the notifications module with tabs and empty state', async ({
    notificationsPage,
  }) => {
    await notificationsPage.goto();
    await notificationsPage.expectTitle(/Notifications .+ TaskForge/i);
    await notificationsPage.expectPath(
      notificationsPage.workspaceHref('/notifications'),
    );
    await notificationsPage.expectLoaded();

    test.skip(
      !(await notificationsPage.isEmpty()),
      'This workspace already has notifications.',
    );
    await notificationsPage.expectEmptyState();
  });

  test('switches between All and Unread tabs', async ({ notificationsPage }) => {
    await notificationsPage.goto();
    await notificationsPage.expectLoaded();

    await notificationsPage.unreadTab.click();
    await expect(notificationsPage.unreadTab).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(notificationsPage.allTab).toHaveAttribute(
      'aria-selected',
      'false',
    );

    await notificationsPage.allTab.click();
    await expect(notificationsPage.allTab).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('keeps Mark all read disabled when there are no unread notifications', async ({
    notificationsPage,
  }) => {
    await notificationsPage.goto();
    await notificationsPage.expectLoaded();

    await expect(notificationsPage.markAllReadButton).toBeDisabled();
  });
});
