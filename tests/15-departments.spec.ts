import { test, expect } from '../fixtures/pages.fixture';

/**
 * Module 15 — Departments.
 *
 * Read-only coverage for the department list and the new-department dialog.
 * The dialog is opened and cancelled only; no department is created.
 *
 * Run: npm run test:modules:chrome -- tests/15-departments.spec.ts
 */
test.describe('Departments (Module 15)', () => {
  test('loads the department list', async ({ departmentsPage }) => {
    await departmentsPage.goto();
    await departmentsPage.expectTitle(/Departments .+ TaskForge/i);
    await departmentsPage.expectPath(
      departmentsPage.workspaceHref('/departments'),
    );
    await departmentsPage.expectLoaded();
    expect(await departmentsPage.departmentCount()).toBeGreaterThan(0);
  });

  test('opens the new-department dialog and cancels without creating', async ({
    departmentsPage,
  }) => {
    await departmentsPage.goto();
    await departmentsPage.expectLoaded();

    await departmentsPage.openNewDepartmentDialog();
    await departmentsPage.expectNewDepartmentDialog();
    await departmentsPage.cancelNewDepartmentDialog();
  });
});
