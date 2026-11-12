import { expect, type Locator, type Page } from '@playwright/test';
import { AppShellPage, type ShellPageOptions } from './AppShellPage';

export class DepartmentsPage extends AppShellPage {
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly newDepartmentButton: Locator;
  readonly departmentLinks: Locator;
  readonly dialog: Locator;

  constructor(page: Page, options: ShellPageOptions = {}) {
    super(page, options);
    this.title = this.main.getByRole('heading', {
      name: 'Departments',
      level: 1,
      exact: true,
    });
    this.subtitle = this.main.getByText(
      'Departments group employees and own projects.',
      { exact: true },
    );
    this.newDepartmentButton = this.main.getByRole('button', {
      name: 'New department',
      exact: true,
    });
    this.departmentLinks = this.main.getByRole('link').filter({
      has: this.main.getByText(/member/, { exact: false }),
    });
    this.dialog = page.getByRole('dialog', { name: 'New department' });
  }

  async goto(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/departments'));
    await this.waitForShell();
    await expect(this.title).toBeVisible();
    await expect(this.newDepartmentButton).toBeVisible();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.subtitle).toBeVisible();
    await expect(this.newDepartmentButton).toBeVisible();
    await expect(
      this.main.getByRole('link').filter({ hasText: 'General' }),
    ).toBeVisible();
    await this.expectNoBrokenValues();
  }

  async departmentCount(): Promise<number> {
    return this.main.getByRole('link').count();
  }

  async openNewDepartmentDialog(): Promise<void> {
    await this.newDepartmentButton.click();
    await expect(this.dialog).toBeVisible();
  }

  async expectNewDepartmentDialog(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(
      this.dialog.getByRole('heading', {
        name: 'New department',
        exact: true,
      }),
    ).toBeVisible();
    await expect(this.dialog.getByLabel('Name')).toBeVisible();
    await expect(this.dialog.getByLabel('Description')).toBeVisible();
    await expect(
      this.dialog.getByRole('button', {
        name: 'Cancel',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      this.dialog.getByRole('button', {
        name: 'Create department',
        exact: true,
      }),
    ).toBeVisible();
    await expect(this.dialog.locator('input[type="checkbox"]')).toHaveCount(3);
  }

  async cancelNewDepartmentDialog(): Promise<void> {
    await this.dialog
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await expect(this.dialog).toBeHidden();
  }

  async expectNoBrokenValues(): Promise<void> {
    await expect(this.main).not.toContainText(/NaN|undefined|Invalid Date/);
  }
}
