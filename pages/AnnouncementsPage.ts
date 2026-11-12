import { expect, type Locator, type Page } from '@playwright/test';
import { AppShellPage, type ShellPageOptions } from './AppShellPage';

export class AnnouncementsPage extends AppShellPage {
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly newAnnouncementButton: Locator;
  readonly allTab: Locator;
  readonly unreadTab: Locator;
  readonly emptyState: Locator;
  readonly dialog: Locator;

  constructor(page: Page, options: ShellPageOptions = {}) {
    super(page, options);
    this.title = this.main.getByRole('heading', {
      name: 'Announcements',
      level: 1,
      exact: true,
    });
    this.subtitle = this.main.getByText(
      "News for the whole Abdul's Workspace team.",
      { exact: true },
    );
    this.newAnnouncementButton = this.main
      .getByRole('button', { name: 'New announcement', exact: true })
      .first();
    this.allTab = this.main.getByRole('tab', {
      name: 'All',
      exact: true,
    });
    this.unreadTab = this.main.getByRole('tab', {
      name: 'Unread',
      exact: true,
    });
    this.emptyState = this.main.getByText('No announcements yet', {
      exact: true,
    });
    this.dialog = page.getByRole('dialog', { name: 'New announcement' });
  }

  async goto(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/announcements'));
    await this.waitForShell();
    await expect(this.title).toBeVisible();
    await expect(this.allTab).toBeVisible();
    await expect(this.unreadTab).toBeVisible();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.subtitle).toBeVisible();
    await expect(this.newAnnouncementButton).toBeVisible();
    await expect(this.allTab).toBeVisible();
    await expect(this.unreadTab).toBeVisible();
    await expect(this.allTab).toHaveAttribute('aria-selected', 'true');
    await this.expectNoBrokenValues();
  }

  async isEmpty(): Promise<boolean> {
    try {
      await this.emptyState.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
    await expect(
      this.main.getByText(
        'Post news, schedule changes or reminders for your team.',
        { exact: true },
      ),
    ).toBeVisible();
  }

  async openNewAnnouncementDialog(): Promise<void> {
    await this.newAnnouncementButton.click();
    await expect(this.dialog).toBeVisible();
  }

  async expectNewAnnouncementDialog(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(
      this.dialog.getByRole('heading', {
        name: 'New announcement',
        exact: true,
      }),
    ).toBeVisible();
    await expect(this.dialog).toContainText(
      'Everyone it is for gets a notification.',
    );
    await expect(this.dialog.getByLabel('Title')).toBeVisible();
    await expect(this.dialog.getByLabel('Message')).toBeVisible();
    await expect(this.dialog.getByRole('switch')).toBeVisible();
    await expect(
      this.dialog.getByRole('button').filter({ hasText: 'Not pinned' }),
    ).toBeVisible();
    await expect(
      this.dialog.getByRole('button', { name: 'Attach files' }),
    ).toBeVisible();
    await expect(
      this.dialog.getByRole('button', { name: 'Cancel', exact: true }),
    ).toBeVisible();
    await expect(
      this.dialog.getByRole('button', { name: 'Post', exact: true }),
    ).toBeDisabled();
    await expect(this.dialog).toContainText('Give it a title.');
    await expect(this.dialog.locator('input[type="file"]')).toHaveCount(1);
  }

  async cancelNewAnnouncementDialog(): Promise<void> {
    await this.dialog
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await expect(this.dialog).toBeHidden();
  }

  async fillAnnouncement(title: string, message: string): Promise<void> {
    await this.dialog.getByLabel('Title').fill(title);
    await this.dialog.getByLabel('Message').fill(message);
    await expect(
      this.dialog.getByRole('button', { name: 'Post', exact: true }),
    ).toBeEnabled();
  }

  async clearAnnouncement(): Promise<void> {
    await this.dialog.getByLabel('Title').fill('');
    await this.dialog.getByLabel('Message').fill('');
    await expect(
      this.dialog.getByRole('button', { name: 'Post', exact: true }),
    ).toBeDisabled();
  }

  async toggleAudience(): Promise<void> {
    const audience = this.dialog.getByRole('switch');
    const before = await audience.getAttribute('aria-checked');
    await audience.click();
    await expect(audience).toHaveAttribute(
      'aria-checked',
      before === 'true' ? 'false' : 'true',
    );
    await audience.click();
    await expect(audience).toHaveAttribute('aria-checked', before ?? 'true');
  }

  async openPinPicker(): Promise<void> {
    await this.dialog
      .getByRole('button')
      .filter({ hasText: 'Not pinned' })
      .click();
    await expect(
      this.page.locator('[data-slot="popover-content"]:visible'),
    ).toBeVisible();
  }

  async closePinPicker(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(
      this.page.locator('[data-slot="popover-content"]:visible'),
    ).toHaveCount(0);
  }

  async expectNoBrokenValues(): Promise<void> {
    await expect(this.main).not.toContainText(/NaN|undefined|Invalid Date/);
  }
}
