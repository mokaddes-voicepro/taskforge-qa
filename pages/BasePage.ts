import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '../utils/env';
import {
  gotoWithRetry,
  type NavigationRetryOptions,
} from '../utils/navigation';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Shared navigation and assertion helpers for every page object. Page objects
 * own all selectors; tests only call their methods.
 */
export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(path: string, options?: NavigationRetryOptions): Promise<void> {
    await gotoWithRetry(this.page, path, options);
  }

  currentPath(): string {
    return new URL(this.page.url()).pathname;
  }

  async expectUrl(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }

  /** Asserts the current pathname, ignoring query/hash differences. */
  async expectPath(path: string): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`${escapeRegExp(path)}(?:[?#].*)?$`),
    );
  }

  async expectTitle(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(pattern);
  }

  /**
   * Dashboard/report modules render skeleton placeholders before their data
   * arrives (QA-007). Wait for real content by asserting no skeleton slots
   * remain in the given scope.
   */
  async waitForSkeletonsToClear(
    scope?: Locator,
    timeout = 30_000,
  ): Promise<void> {
    const target = scope ?? this.page.locator('body');

    await expect
      .poll(() => target.locator('[data-slot="skeleton"]').count(), {
        timeout,
        message: 'Expected loading skeletons to be replaced by real content',
      })
      .toBe(0);
  }

  /** Pins the viewport for responsive checks (NFR-03). */
  async setViewportSize(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }

  async viewportSize(): Promise<{ width: number; height: number }> {
    const size = this.page.viewportSize();

    if (!size) {
      throw new Error('The browser viewport is not set');
    }

    return { width: size.width, height: size.height };
  }

  /**
   * True when the document is wider than the viewport, i.e. content overflows
   * horizontally and would trigger a mobile sideways scroll (NFR-03).
   */
  async hasHorizontalOverflow(): Promise<boolean> {
    const metrics = await this.page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    return metrics.scrollWidth > metrics.clientWidth + 1;
  }

  async expectNoHorizontalOverflow(): Promise<void> {
    await expect
      .poll(() => this.hasHorizontalOverflow(), {
        timeout: 15_000,
        message: 'Expected no horizontal overflow at the current viewport',
      })
      .toBe(false);
  }
}
