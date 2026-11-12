import { test, expect } from '../fixtures/pages.fixture';

/**
 * Module 14 — Projects.
 *
 * Read-only coverage for the projects list, status tabs, filters, layout
 * toggle and the new-project dialog. The dialog is opened and cancelled only;
 * no project is created or starred.
 *
 * Run: npm run test:modules:chrome -- tests/14-projects.spec.ts
 */
test.describe('Projects (Module 14)', () => {
  test('loads the active projects list with its controls', async ({
    projectsPage,
  }) => {
    await projectsPage.goto();
    await projectsPage.expectTitle(/Projects .+ TaskForge/i);
    await projectsPage.expectPath(projectsPage.workspaceHref('/projects'));
    await projectsPage.expectLoaded();

    await expect(projectsPage.projectsTable).toBeVisible();
    await expect(
      projectsPage.projectsTable.getByRole('row').filter({ hasText: 'Global Softel' }),
    ).toHaveCount(1);
  });

  test('switches between Active, Overdue and Archived tabs', async ({
    projectsPage,
  }) => {
    await projectsPage.goto();
    await projectsPage.expectLoaded();

    await projectsPage.overdueTab.click();
    await expect(projectsPage.overdueTab).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await projectsPage.archivedTab.click();
    await expect(projectsPage.archivedTab).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await projectsPage.activeTab.click();
    await expect(projectsPage.activeTab).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('switches the project layout between Table and Cards', async ({
    projectsPage,
  }) => {
    await projectsPage.goto();
    await projectsPage.expectLoaded();

    await projectsPage.cardsLayout.click();
    await expect(projectsPage.cardsLayout).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await projectsPage.tableLayout.click();
    await expect(projectsPage.tableLayout).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('opens the new-project dialog and cancels without creating', async ({
    projectsPage,
  }) => {
    await projectsPage.goto();
    await projectsPage.expectLoaded();

    await projectsPage.openNewProjectDialog();
    await projectsPage.expectNewProjectDialog();
    await projectsPage.cancelNewProjectDialog();
  });
});
