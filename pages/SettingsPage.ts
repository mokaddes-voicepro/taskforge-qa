import { expect, type Locator, type Page } from '@playwright/test';
import { AppShellPage, type ShellPageOptions } from './AppShellPage';

export class SettingsPage extends AppShellPage {
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly settingsNav: Locator;
  readonly nameInput: Locator;
  readonly urlInput: Locator;
  readonly saveChangesButtons: Locator;
  readonly businessType: Locator;
  readonly timezone: Locator;
  readonly deleteWorkspaceButton: Locator;

  constructor(page: Page, options: ShellPageOptions = {}) {
    super(page, options);
    this.title = this.main.getByRole('heading', {
      name: 'Settings',
      level: 1,
      exact: true,
    });
    this.subtitle = this.main.getByText("Abdul's Workspace", { exact: true });
    this.settingsNav = this.main.getByRole('navigation', {
      name: 'Settings',
    });
    this.nameInput = this.main.getByRole('textbox', { name: 'Name', exact: true });
    this.urlInput = this.main.getByRole('textbox', { name: 'URL name', exact: true });
    this.saveChangesButtons = this.main.getByRole('button', {
      name: 'Save changes',
      exact: true,
    });
    this.businessType = this.main.getByRole('radiogroup', {
      name: 'Type of business',
    });
    this.timezone = this.main.getByRole('combobox', { name: 'Timezone' });
    this.deleteWorkspaceButton = this.main.getByRole('button', {
      name: 'Delete workspace',
      exact: true,
    });
  }

  async goto(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/settings'));
    await this.waitForShell();
    await expect(this.title).toBeVisible();
    await expect(this.settingsNav).toBeVisible();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.subtitle).toBeVisible();
    await expect(this.settingsNav).toBeVisible();
    for (const label of [
      'General',
      'Offices',
      'HR & Pay',
      'Holidays',
      'Leave',
      'Plan & usage',
    ]) {
      await expect(
        this.settingsNav.getByRole('link', { name: label, exact: true }),
      ).toBeVisible();
    }
    await expect(this.nameInput).toBeVisible();
    await expect(this.urlInput).toBeVisible();
    await expect(this.saveChangesButtons.first()).toBeDisabled();
    await expect(this.businessType).toBeVisible();
    await expect(this.timezone).toBeVisible();
    await expect(this.deleteWorkspaceButton).toBeVisible();
    await this.expectNoBrokenValues();
  }

  async expectNoBrokenValues(): Promise<void> {
    await expect(this.main).not.toContainText(/NaN|undefined|Invalid Date/);
  }
}
