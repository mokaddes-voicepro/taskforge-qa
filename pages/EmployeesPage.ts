import { expect, type Locator, type Page } from '@playwright/test';
import { AppShellPage, type ShellPageOptions } from './AppShellPage';

export class EmployeesPage extends AppShellPage {
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly exportButton: Locator;
  readonly addEmployeesButton: Locator;
  readonly searchInput: Locator;
  readonly departmentFilter: Locator;
  readonly officeFilter: Locator;
  readonly roleFilter: Locator;
  readonly employmentFilter: Locator;
  readonly count: Locator;
  readonly dialog: Locator;

  constructor(page: Page, options: ShellPageOptions = {}) {
    super(page, options);
    this.title = this.main.getByRole('heading', {
      name: 'Employees',
      level: 1,
      exact: true,
    });
    this.subtitle = this.main.getByText("Abdul's Workspace", { exact: true });
    this.exportButton = this.main.getByRole('button', {
      name: 'Export CSV',
      exact: true,
    });
    this.addEmployeesButton = this.main.getByRole('button', {
      name: 'Add employees',
      exact: true,
    });
    this.searchInput = this.main.getByRole('textbox', {
      name: 'Search employees',
    });
    this.departmentFilter = this.main.getByRole('combobox', {
      name: 'Filter by department',
    });
    this.officeFilter = this.main.getByRole('combobox', {
      name: 'Filter by office',
    });
    this.roleFilter = this.main.getByRole('combobox', {
      name: 'Filter by role',
    });
    this.employmentFilter = this.main.getByRole('combobox', {
      name: 'Filter by employment',
    });
    this.count = this.main.getByText(/\d+ employees/, { exact: false });
    this.dialog = page.getByRole('dialog', { name: 'Add members' });
  }

  async goto(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/employees'));
    await this.waitForShell();
    await expect(this.title).toBeVisible();
    await expect(this.addEmployeesButton).toBeVisible();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.subtitle).toBeVisible();
    await expect(this.exportButton).toBeVisible();
    await expect(this.addEmployeesButton).toBeVisible();
    await expect(this.searchInput).toBeVisible();
    await expect(this.departmentFilter).toBeVisible();
    await expect(this.officeFilter).toBeVisible();
    await expect(this.roleFilter).toBeVisible();
    await expect(this.employmentFilter).toBeVisible();
    await expect(this.count).toBeVisible();
    await this.expectNoBrokenValues();
  }

  async openAddEmployeesDialog(): Promise<void> {
    await this.addEmployeesButton.click();
    await expect(this.dialog).toBeVisible();
  }

  async expectAddEmployeesDialog(): Promise<void> {
    await expect(this.dialog).toBeVisible();
    await expect(
      this.dialog.getByRole('heading', { name: 'Add members', exact: true }),
    ).toBeVisible();
    await expect(
      this.dialog.getByRole('button', { name: 'Cancel', exact: true }),
    ).toBeVisible();
    await expect(
      this.dialog.getByRole('button', { name: 'Add member', exact: true }),
    ).toBeVisible();
  }

  async cancelAddEmployeesDialog(): Promise<void> {
    await this.dialog
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await expect(this.dialog).toBeHidden();
  }

  async expectNoBrokenValues(): Promise<void> {
    await expect(this.main).not.toContainText(/NaN|undefined|Invalid Date/);
  }
}
