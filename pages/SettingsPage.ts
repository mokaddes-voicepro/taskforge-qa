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

  // Read-only sub-page coverage for the six settings sections (ST-01 to ST-08).
  // Locators are grounded in the raw DOM captures under qa/raw/ (16-settings,
  // 20-24 settings sub-pages) and the creation dialogs (form-*.json).
  readonly officesHeading: Locator;
  readonly officesNewOfficeButton: Locator;
  readonly officesActiveTab: Locator;
  readonly officesArchivedTab: Locator;
  readonly officesEmptyState: Locator;
  readonly officesDialog: Locator;
  readonly officesNameInput: Locator;
  readonly officesGeofenceRadius: Locator;
  readonly officesWeeklyLaborBudget: Locator;
  readonly officesCancelButton: Locator;
  readonly officesCreateLocationButton: Locator;
  readonly hrContentMarker: Locator;
  readonly hrSaveButton: Locator;
  readonly hrGraceInput: Locator;
  readonly hrOvertimeAfterInput: Locator;
  readonly hrOvertimeMultiplierInput: Locator;
  readonly hrDoubleTimeMultiplierInput: Locator;
  readonly hrStandardHoursInput: Locator;
  readonly hrRequireLocationToggle: Locator;
  readonly hrCurrencyControl: Locator;
  readonly holidaysHeading: Locator;
  readonly holidaysAddButton: Locator;
  readonly holidaysEmptyState: Locator;
  readonly holidaysPreviousYearButton: Locator;
  readonly holidaysNextYearButton: Locator;
  readonly holidaysCopyFromButton: Locator;
  readonly leaveContentMarker: Locator;
  readonly leaveAddTypeButton: Locator;
  readonly leaveVacationTypeButton: Locator;
  readonly leaveUnpaidLeaveTypeButton: Locator;
  readonly planHeading: Locator;
  readonly planUpgradeLink: Locator;
  readonly planLimitsNote: Locator;

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
      exact: true,
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

    this.officesHeading = this.main.getByRole('heading', {
      name: 'Offices',
      level: 2,
      exact: true,
    });
    this.officesNewOfficeButton = this.main.getByRole('button', {
      name: 'New office',
      exact: true,
    }).first();
    this.officesActiveTab = this.main.getByRole('tab', {
      name: 'Active',
      exact: true,
    });
    this.officesArchivedTab = this.main.getByRole('tab', {
      name: 'Archived',
      exact: true,
    });
    this.officesEmptyState = this.main.getByText('No offices yet', {
      exact: true,
    });
    this.officesDialog = page.getByRole('dialog', { name: 'New office' });
    this.officesNameInput = this.officesDialog.getByLabel('Name');
    this.officesGeofenceRadius = this.officesDialog.getByLabel(
      'Geofence radius (meters)',
    );
    this.officesWeeklyLaborBudget = this.officesDialog.getByLabel(
      /Weekly labor budget/,
    );
    this.officesCancelButton = this.officesDialog.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });
    this.officesCreateLocationButton = this.officesDialog.getByRole('button', {
      name: 'Create location',
      exact: true,
    });

    this.hrContentMarker = this.main.getByText('Overtime is counted per week');
    this.hrSaveButton = this.main.getByRole('button', {
      name: 'Save changes',
      exact: true,
    }).first();
    this.hrGraceInput = this.main.getByRole('spinbutton', {
      name: /Late \/ early grace/i,
    });
    this.hrOvertimeAfterInput = this.main.getByRole('spinbutton', {
      name: /Weekly overtime after/i,
    });
    this.hrOvertimeMultiplierInput = this.main.getByRole('spinbutton', {
      name: /Overtime multiplier/i,
    });
    this.hrDoubleTimeMultiplierInput = this.main.getByRole('spinbutton', {
      name: /Double-time multiplier/i,
    });
    this.hrStandardHoursInput = this.main.getByRole('spinbutton', {
      name: /Standard hours per day/i,
    });
    this.hrRequireLocationToggle = this.main.getByRole('switch', {
      name: /Require location to clock in/i,
    });
    this.hrCurrencyControl = this.main.getByRole('combobox', {
      name: /Currency/i,
    });

    this.holidaysHeading = this.main.getByRole('heading', {
      name: '2026',
      level: 2,
      exact: true,
    });
    this.holidaysAddButton = this.main.getByRole('button', {
      name: 'Add holiday',
      exact: true,
    }).first();
    this.holidaysEmptyState = this.main.getByText(/No holidays in 2026/);
    this.holidaysPreviousYearButton = this.main.getByRole('button', {
      name: 'Previous year',
      exact: true,
    });
    this.holidaysNextYearButton = this.main.getByRole('button', {
      name: 'Next year',
      exact: true,
    });
    this.holidaysCopyFromButton = this.main.getByRole('button', {
      name: 'Copy from 2025',
      exact: true,
    });

    this.leaveContentMarker = this.main.getByText(
      "Everyone starts the year with each type's allowance",
    );
    this.leaveAddTypeButton = this.main.getByRole('button', {
      name: 'Add type',
      exact: true,
    });
    this.leaveVacationTypeButton = this.main.getByRole('button', {
      name: 'Edit Vacation',
      exact: true,
    });
    this.leaveUnpaidLeaveTypeButton = this.main.getByRole('button', {
      name: 'Edit Unpaid leave',
      exact: true,
    });

    this.planHeading = this.main.getByRole('heading', {
      name: 'Free plan',
      level: 2,
      exact: true,
    });
    this.planUpgradeLink = this.main.getByRole('link', {
      name: 'Upgrade to Pro',
      exact: true,
    });
    this.planLimitsNote = this.main.getByText(/limits are full/);
  }

  async goto(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/settings'));
    await this.waitForShell();
    await expect(this.title).toBeVisible();
    await expect(this.settingsNav).toBeVisible();
  }

  async gotoOffices(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/settings/locations'));
    await this.waitForShell();
    await this.officesHeading.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async gotoHr(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/settings/hr'));
    await this.waitForShell();
    await this.hrContentMarker.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async gotoHolidays(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/settings/holidays'));
    await this.waitForShell();
    await this.holidaysHeading.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async gotoLeave(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/settings/leave'));
    await this.waitForShell();
    await this.leaveContentMarker.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async gotoPlan(): Promise<void> {
    await this.gotoAuthenticated(this.workspaceHref('/settings/plan'));
    await this.waitForShell();
    await this.planHeading.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.title).toBeVisible();
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

  // --- Offices sub-page (ST-04, read-only) ---

  async expectOfficesLoaded(): Promise<void> {
    await expect(this.officesHeading).toBeVisible();
    await expect(this.officesActiveTab).toBeVisible();
    await expect(this.officesArchivedTab).toBeVisible();
    await expect(this.officesNewOfficeButton).toBeVisible();
    await expect(this.officesEmptyState).toBeVisible();
  }

  async expectOfficesDialog(): Promise<void> {
    await expect(this.officesDialog).toBeVisible();
    await expect(this.officesNameInput).toBeVisible();
    await expect(this.officesGeofenceRadius).toBeVisible();
    await expect(this.officesGeofenceRadius).toHaveValue('150');
    await expect(this.officesWeeklyLaborBudget).toBeVisible();
    await expect(this.officesCancelButton).toBeVisible();
    await expect(this.officesCreateLocationButton).toBeVisible();
  }

  async openOfficesDialog(): Promise<void> {
    await this.officesNewOfficeButton.click();
    await this.officesDialog.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async cancelOfficesDialog(): Promise<void> {
    await this.officesCancelButton.click();
    await expect(this.officesDialog).toBeHidden();
  }

  // --- HR & Pay sub-page (ST-05, read-only) ---

  async expectHrLoaded(): Promise<void> {
    await expect(this.hrContentMarker).toBeVisible();
    await expect(this.hrGraceInput).toBeVisible();
    await expect(this.hrOvertimeAfterInput).toBeVisible();
    await expect(this.hrOvertimeMultiplierInput).toBeVisible();
    await expect(this.hrDoubleTimeMultiplierInput).toBeVisible();
    await expect(this.hrStandardHoursInput).toBeVisible();
    await expect(this.hrRequireLocationToggle).toBeVisible();
    await expect(this.hrCurrencyControl).toBeVisible();
    await expect(this.hrSaveButton).toBeDisabled();
    await this.expectNoBrokenValues();
  }

  // --- Holidays sub-page (ST-06, read-only) ---

  async expectHolidaysLoaded(): Promise<void> {
    await expect(this.holidaysHeading).toBeVisible();
    await expect(this.holidaysAddButton).toBeVisible();
    await expect(this.holidaysEmptyState).toBeVisible();
    await expect(this.holidaysPreviousYearButton).toBeVisible();
    await expect(this.holidaysNextYearButton).toBeVisible();
    await expect(this.holidaysCopyFromButton).toBeVisible();
  }

  // --- Leave sub-page (ST-07, read-only) ---

  async expectLeaveLoaded(): Promise<void> {
    await expect(this.leaveContentMarker).toBeVisible();
    await expect(this.leaveAddTypeButton).toBeVisible();
    await expect(this.leaveVacationTypeButton).toBeVisible();
    await expect(this.leaveUnpaidLeaveTypeButton).toBeVisible();
  }

  // --- Plan & usage sub-page (ST-08, read-only) ---

  async expectPlanLoaded(): Promise<void> {
    await expect(this.planHeading).toBeVisible();
    await expect(this.planUpgradeLink).toBeVisible();
    await expect(this.planLimitsNote).toBeVisible();
  }
}
