import {
  expect,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';
import { env } from '../utils/env';
import { BasePage } from './BasePage';

const GET_SESSION_ENDPOINT = '/api/v1/auth/get-session';
const LOGIN_RATE_LIMIT_WAIT_MS = 10_000;

export interface NavItem {
  label: string;
  segment: string;
}

export interface ShellPageOptions {
  /** Re-applies saved auth cookies after a transient /login redirect. */
  restoreSession?: () => Promise<void>;
}

/** Workspace destinations in the order rendered by the sidebar. */
export const WORKSPACE_NAV: readonly NavItem[] = [
  { label: 'Home', segment: '' },
  { label: 'Tasks', segment: '/tasks' },
  { label: 'Calendar', segment: '/calendar' },
  { label: 'Schedule', segment: '/schedule' },
  { label: 'Time clock', segment: '/time-clock' },
  { label: 'Timesheets', segment: '/timesheets' },
  { label: 'Leave', segment: '/leave' },
  { label: 'Labor cost', segment: '/reports/labor-cost' },
  { label: 'Payroll', segment: '/reports/payroll' },
  { label: 'Working now', segment: '/working-now' },
  { label: 'Chat', segment: '/chat' },
  { label: 'Announcements', segment: '/announcements' },
  { label: 'Notifications', segment: '/notifications' },
  { label: 'Projects', segment: '/projects' },
] as const;

export const SETTINGS_NAV: readonly NavItem[] = [
  { label: 'Departments', segment: '/departments' },
  { label: 'Employees', segment: '/employees' },
  { label: 'Settings', segment: '/settings' },
] as const;

/**
 * The authenticated application shell: sidebar, header, status strip and main
 * content. Every module page object extends this so navigation and readiness
 * checks stay in one place.
 */
export class AppShellPage extends BasePage {
  readonly main: Locator;
  readonly workspaceNav: Locator;
  readonly settingsNav: Locator;
  readonly searchButton: Locator;
  readonly createButton: Locator;
  readonly notificationsButton: Locator;
  readonly accountMenuButton: Locator;
  readonly headerClockInLink: Locator;
  protected readonly restoreSession?: () => Promise<void>;

  constructor(page: Page, options: ShellPageOptions = {}) {
    super(page);
    this.restoreSession = options.restoreSession;
    this.main = page.getByRole('main');
    this.workspaceNav = page
      .getByRole('navigation', { name: 'Workspace', exact: true })
      .first();
    this.settingsNav = page.getByRole('navigation', {
      name: 'Workspace settings',
      exact: true,
    });
    this.searchButton = page
      .getByRole('button', { name: 'Search', exact: true })
      .first();
    this.createButton = page.getByRole('button', {
      name: 'Create',
      exact: true,
    });
    this.notificationsButton = page.getByRole('button', {
      name: 'Notifications',
      exact: true,
    });
    this.accountMenuButton = page.getByRole('button', {
      name: 'Account menu',
    });
    this.headerClockInLink = page
      .getByRole('banner')
      .getByRole('link', { name: 'Clock in' });
  }

  /** Absolute href for a workspace segment (e.g. `/tasks`). */
  workspaceHref(segment: string): string {
    return `${env.workspacePath}${segment}`;
  }

  workspaceNavLink(label: string): Locator {
    return this.workspaceNav.getByRole('link', { name: label, exact: true });
  }

  settingsNavLink(label: string): Locator {
    return this.settingsNav.getByRole('link', { name: label, exact: true });
  }

  async goto(path: string = env.workspacePath): Promise<void> {
    await this.gotoAuthenticated(path);
  }

  /**
   * Navigates to an authenticated route. A valid stored session is
   * occasionally dropped on a single navigation (observed across browsers and
   * related to the transient auth behaviour in QA-003), so restore the saved
   * cookies and retry with backoff. When the app rate-limits its get-session
   * endpoint it redirects to /login with a 429, so honour X-Retry-After
   * instead of retrying inside the same limiter window. A genuinely invalid
   * session still fails every attempt.
   */
  protected async gotoAuthenticated(
    path: string,
    attempts = 4,
  ): Promise<void> {
    const backoffMs = [2_000, 10_000, 15_000];
    let lastError: unknown;

    for (let current = 1; current <= attempts; current += 1) {
      let rateLimitWaitMs = 0;
      const recordRateLimit = (response: Response) => {
        if (
          response.status() === 429 &&
          response.url().includes(GET_SESSION_ENDPOINT)
        ) {
          const retryAfterSeconds = Number(
            response.headers()['x-retry-after'] ?? 0,
          );

          if (Number.isFinite(retryAfterSeconds)) {
            rateLimitWaitMs = Math.max(
              rateLimitWaitMs,
              retryAfterSeconds * 1_000,
            );
          }
        }
      };

      this.page.on('response', recordRateLimit);

      try {
        await this.navigate(path);

        if (this.currentPath() === '/login') {
          // The client-side get-session response can land just after the
          // redirect, so give it a moment to report a 429 wait.
          await this.page.waitForTimeout(1_000);
          throw new Error(`Redirected to /login while opening ${path}`);
        }

        await this.waitForShell();
        return;
      } catch (cause) {
        lastError = cause;

        if (current < attempts) {
          await this.restoreSession?.();
          await this.page.waitForTimeout(
            Math.max(backoffMs[current - 1] ?? 10_000, rateLimitWaitMs + 1_000),
          );
        }
      } finally {
        this.page.off('response', recordRateLimit);
      }
    }

    throw lastError;
  }

  /**
   * Runs an in-page interaction and recovers once if the app redirects to
   * /login because its get-session endpoint was rate-limited. Reopen the
   * module after the limiter window, then retry the interaction.
   */
  protected async retryOnLoginRedirect<T>(
    recoveryPath: string,
    action: () => Promise<T>,
    attempts = 2,
  ): Promise<T> {
    let lastError: unknown;

    for (let current = 1; current <= attempts; current += 1) {
      try {
        return await action();
      } catch (cause) {
        lastError = cause;

        if (current >= attempts || this.currentPath() !== '/login') {
          throw cause;
        }

        await this.restoreSession?.();
        await this.page.waitForTimeout(LOGIN_RATE_LIMIT_WAIT_MS);
        await this.gotoAuthenticated(recoveryPath);
      }
    }

    throw lastError;
  }

  async waitForShell(timeout = 30_000): Promise<void> {
    await this.main.waitFor({ state: 'visible', timeout });
    await this.accountMenuButton.waitFor({ state: 'visible', timeout });
  }

  async expectSidebarNavigation(): Promise<void> {
    for (const item of WORKSPACE_NAV) {
      const link = this.workspaceNavLink(item.label);

      await expect(link, `Sidebar link "${item.label}"`).toBeVisible();
      await expect(link).toHaveAttribute(
        'href',
        this.workspaceHref(item.segment),
      );
    }

    for (const item of SETTINGS_NAV) {
      const link = this.settingsNavLink(item.label);

      await expect(link, `Settings link "${item.label}"`).toBeVisible();
      await expect(link).toHaveAttribute(
        'href',
        this.workspaceHref(item.segment),
      );
    }
  }

  /**
   * Returns the realtime status copy, or an empty string when no banner is
   * present. QA-001 currently keeps the paused banner on every page.
   */
  async readRealtimeStatus(): Promise<string> {
    const status = this.page.getByRole('status');
    const count = await status.count();

    for (let index = 0; index < count; index += 1) {
      const text =
        (await status
          .nth(index)
          .textContent()
          .catch(() => '')) ?? '';
      const clean = text.replace(/\s+/g, ' ').trim();

      if (clean) {
        return clean;
      }
    }

    return '';
  }

  async expectRealtimeStatusReported(): Promise<string> {
    const status = await this.readRealtimeStatus();

    expect(
      status === '' || /reconnecting|live|connected|paused/i.test(status),
      `Unexpected realtime status copy: "${status}"`,
    ).toBe(true);

    return status;
  }
}
