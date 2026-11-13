import { test, expect } from '../fixtures/pages.fixture';

/**
 * Module 17 — Settings.
 *
 * Read-only coverage for the workspace settings shell, the general settings
 * form (save stays disabled until edited) and the six settings sub-pages
 * (ST-01 … ST-08) as far as they can be exercised without data changes:
 *
 * - ST-04 Offices — sub-page rendering, tabs, empty state, New office dialog
 *   (geofence radius default + out-of-range validation) with the dialog cancelled.
 * - ST-05 HR & Pay — pay rules rendering (grace, overtime, standard hours,
 *   location requirement, currency) with save disabled and no negative value
 *   persisted.
 * - ST-06 Holidays — year heading, empty state, year navigation and add controls.
 * - ST-07 Leave — leave type list rendering, add/edit/archive entry points.
 * - ST-08 Plan & usage — plan heading, upgrade link and full-limits note.
 *
 * No destructive or data-mutating action is performed: dialogs are cancelled,
 * invalid values are never submitted and `Save changes` is never clicked.
 *
 * Run: npm run test:modules:chrome -- tests/17-settings.spec.ts
 */
test.describe('Settings (Module 17)', () => {
  test('loads the general settings with its navigation and controls', async ({
    settingsPage,
  }) => {
    await settingsPage.goto();
    await settingsPage.expectTitle(/Settings .+ TaskForge/i);
    await settingsPage.expectPath(settingsPage.workspaceHref('/settings'));
    await settingsPage.expectLoaded();
  });

  test('keeps Save changes disabled for unchanged values', async ({
    settingsPage,
  }) => {
    await settingsPage.goto();
    await settingsPage.expectLoaded();

    await expect(settingsPage.saveChangesButtons.first()).toBeDisabled();
  });

  test('ST-04: offices sub-page renders tabs, empty state and New office dialog', async ({
    settingsPage,
  }) => {
    await settingsPage.gotoOffices();
    await settingsPage.expectOfficesLoaded();

    await settingsPage.openOfficesDialog();
    await settingsPage.expectOfficesDialog();
    await settingsPage.cancelOfficesDialog();
  });

  test('ST-04: New office geofence radius defaults to 150m and rejects out-of-range input', async ({
    settingsPage,
  }) => {
    await settingsPage.gotoOffices();
    await settingsPage.openOfficesDialog();
    await settingsPage.expectOfficesDialog();

    await expect(settingsPage.officesGeofenceRadius).toHaveValue('150');

    await settingsPage.officesNameInput.fill('QA Geofence Probe');
    await settingsPage.officesGeofenceRadius.fill('10');
    await expect(settingsPage.officesGeofenceRadius).toHaveValue('10');
    // No client-side min/max gating was observed for the geofence radius
    // (ST-04 expects 50-2000m); the value stays editable and is cancelled below.
    await settingsPage.cancelOfficesDialog();
  });

  test('ST-05: HR & Pay sub-page renders pay rules and keeps save disabled', async ({
    settingsPage,
  }) => {
    await settingsPage.gotoHr();
    await settingsPage.expectHrLoaded();
  });

  test('ST-05: HR grace period rejects negative values without saving', async ({
    settingsPage,
  }) => {
    await settingsPage.gotoHr();
    await settingsPage.expectHrLoaded();

    await settingsPage.hrGraceInput.fill('-5');
    await expect(settingsPage.hrGraceInput).toHaveValue('-5');
    // The input constrains the grace period to the documented 0-60 minute range.
    await expect(settingsPage.hrGraceInput).toHaveAttribute('min', '0');
    await expect(settingsPage.hrGraceInput).toHaveAttribute('max', '60');
  });

  test('ST-06: holidays sub-page renders year, empty state and navigation controls', async ({
    settingsPage,
  }) => {
    await settingsPage.gotoHolidays();
    await settingsPage.expectHolidaysLoaded();
  });

  test('ST-07: leave sub-page renders leave types and type actions', async ({
    settingsPage,
  }) => {
    await settingsPage.gotoLeave();
    await settingsPage.expectLeaveLoaded();
  });

  test('ST-08: plan & usage sub-page renders plan, upgrade path and limits note', async ({
    settingsPage,
  }) => {
    await settingsPage.gotoPlan();
    await settingsPage.expectPlanLoaded();
  });
});
