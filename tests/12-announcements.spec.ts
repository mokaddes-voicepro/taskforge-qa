import { test, expect } from '../fixtures/pages.fixture';

/**
 * Module 12 — Announcements.
 *
 * Read-only coverage for the announcement list, All/Unread tabs, empty state
 * and the new-announcement dialog. The dialog is filled and cancelled only; no
 * announcement is posted, pinned or deleted.
 *
 * Run: npm run test:modules:chrome -- tests/12-announcements.spec.ts
 */
test.describe('Announcements (Module 12)', () => {
  test('loads the announcements module with tabs and empty state', async ({
    announcementsPage,
  }) => {
    await announcementsPage.goto();
    await announcementsPage.expectTitle(/Announcements .+ TaskForge/i);
    await announcementsPage.expectPath(
      announcementsPage.workspaceHref('/announcements'),
    );
    await announcementsPage.expectLoaded();

    test.skip(
      !(await announcementsPage.isEmpty()),
      'This workspace already has announcements.',
    );
    await announcementsPage.expectEmptyState();
  });

  test('switches between All and Unread tabs', async ({ announcementsPage }) => {
    await announcementsPage.goto();
    await announcementsPage.expectLoaded();

    await announcementsPage.unreadTab.click();
    await expect(announcementsPage.unreadTab).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(announcementsPage.allTab).toHaveAttribute(
      'aria-selected',
      'false',
    );

    await announcementsPage.allTab.click();
    await expect(announcementsPage.allTab).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('opens the new-announcement dialog and cancels without posting', async ({
    announcementsPage,
  }) => {
    await announcementsPage.goto();
    await announcementsPage.expectLoaded();

    const beforeEmpty = await announcementsPage.isEmpty();

    await announcementsPage.openNewAnnouncementDialog();
    await announcementsPage.expectNewAnnouncementDialog();
    await announcementsPage.cancelNewAnnouncementDialog();

    expect(
      await announcementsPage.isEmpty(),
      'Cancelling must not create an announcement',
    ).toBe(beforeEmpty);
  });

  test('gates Post on a title and message, then clears the draft', async ({
    announcementsPage,
  }) => {
    await announcementsPage.goto();
    await announcementsPage.expectLoaded();

    await announcementsPage.openNewAnnouncementDialog();
    await announcementsPage.expectNewAnnouncementDialog();

    await announcementsPage.fillAnnouncement(
      'QA read-only announcement check',
      'This draft is never posted.',
    );
    await announcementsPage.clearAnnouncement();

    await announcementsPage.cancelNewAnnouncementDialog();
  });

  test('toggles the audience and pin controls without saving', async ({
    announcementsPage,
  }) => {
    await announcementsPage.goto();
    await announcementsPage.expectLoaded();

    await announcementsPage.openNewAnnouncementDialog();
    await announcementsPage.expectNewAnnouncementDialog();

    await announcementsPage.toggleAudience();
    await announcementsPage.openPinPicker();
    await announcementsPage.closePinPicker();

    await announcementsPage.cancelNewAnnouncementDialog();
  });
});
