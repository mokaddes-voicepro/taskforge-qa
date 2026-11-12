import { test, expect } from '../fixtures/pages.fixture';

/**
 * Module 17 — Settings.
 *
 * Read-only coverage for the workspace settings shell and general settings.
 * Save changes stays disabled for the unchanged values, and the danger-zone
 * delete button is checked without clicking it.
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
});
