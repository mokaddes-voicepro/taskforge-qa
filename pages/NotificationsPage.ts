import { expect, type Locator, type Page } from '@playwright/test';
import { AppShellPage, type ShellPageOptions } from './AppShellPage';

export class NotificationsPage extends AppShellPage {
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly markAllReadButton: Locator;
  readonly allTab: Locator;
  readonly unreadTab: Locator;
  readonly emptyState: Locator;

  constructor(page: Page, options: ShellPageOptions = {}) {
    super(page, options);
    this.title = this.main.getByRole('heading', {
      name: 'Notifications',
      level: 1,
      exact: true,
    });
    this.subtitle = this.main.getByText(
      'Latest 100 notifications in this workspace.',
      { exact: true },
    );
    this.markAllReadButton = this.main.getByRole('button', {
      name: 'Mark all read',
      exact: true,
    });
    this.allTab = this.main.getByRole('tab', { name: 'All', exact: true });
    this.unreadTab = this.main.getByRole('tab', {
      name: 'Unread',
      exact: true,
    });
    this.emptyState = this.main.getByText("You're all caught up", {
      exact: true,
    });
  }

  async goto(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/notifications'));
    await this.waitForShell();
    await expect(this.title).toBeVisible();
    await expect(this.allTab).toBeVisible();
    await expect(this.unreadTab).toBeVisible();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.subtitle).toBeVisible();
    await expect(this.markAllReadButton).toBeVisible();
    await expect(this.markAllReadButton).toBeDisabled();
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
      this.main.getByText('New activity will show up here.', { exact: true }),
    ).toBeVisible();
  }

  async expectNoBrokenValues(): Promise<void> {
    await expect(this.main).not.toContainText(/NaN|undefined|Invalid Date/);
  }
}
