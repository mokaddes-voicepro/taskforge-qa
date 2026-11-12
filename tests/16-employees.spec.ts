import { test, expect } from '../fixtures/pages.fixture';

/**
 * Module 16 — Employees.
 *
 * Read-only coverage for the employee list, filters, search and the add-members
 * dialog. No employee is added, removed or reassigned.
 *
 * Run: npm run test:modules:chrome -- tests/16-employees.spec.ts
 */
test.describe('Employees (Module 16)', () => {
  test('loads the employee list with its controls', async ({ employeesPage }) => {
    await employeesPage.goto();
    await employeesPage.expectTitle(/Employees .+ TaskForge/i);
    await employeesPage.expectPath(employeesPage.workspaceHref('/employees'));
    await employeesPage.expectLoaded();
  });

  test('search shows no match and clears back to the list', async ({
    employeesPage,
  }) => {
    await employeesPage.goto();
    await employeesPage.expectLoaded();

    await employeesPage.searchInput.fill('zzzz-no-match');
    await expect(employeesPage.count).toContainText('0 of 3 employees');

    await employeesPage.searchInput.fill('');
    await expect(employeesPage.count).toContainText('3 employees');
  });

  test('opens the add-members dialog and cancels without adding', async ({
    employeesPage,
  }) => {
    await employeesPage.goto();
    await employeesPage.expectLoaded();

    await employeesPage.openAddEmployeesDialog();
    await employeesPage.expectAddEmployeesDialog();
    await employeesPage.cancelAddEmployeesDialog();
  });
});
