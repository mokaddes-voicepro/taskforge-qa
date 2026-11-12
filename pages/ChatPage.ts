import { expect, type Locator, type Page } from '@playwright/test';
import { AppShellPage, type ShellPageOptions } from './AppShellPage';

export const CHAT_FILTERS = ['All', 'Channels', 'Direct'] as const;

export type ChatFilter = (typeof CHAT_FILTERS)[number];

export const CHAT_EMPTY_HINT =
  'Send the first message to get things going 👋';

export interface ChatConversation {
  name: string;
  kind: string;
  href: string;
  current: boolean;
}

export interface ChatMember {
  name: string;
  detail: string;
  role: string | null;
}

export interface ChatDirectMessageOption {
  name: string;
  detail: string;
}

export interface ChatEmojiPicker {
  categories: string[];
  count: number;
}

const MEMBER_SUMMARY_PATTERN = /^\d+ members? · /;
const SHOW_MEMBERS_BUTTON = /^Show all \d+ members$/;
const NEW_CHANNEL_NAME = /^New channel$/;
const SEARCH_MESSAGES_NAME = /^Search messages$/;

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Conversation heading as rendered in the chat header. */
export function conversationHeading(conversation: ChatConversation): string {
  if (conversation.kind === 'Workspace') {
    return 'Workspace chat';
  }

  if (conversation.kind === 'Department') {
    return `${conversation.name} chat`;
  }

  return conversation.name;
}

/** Composer placeholder for a conversation. */
export function conversationPlaceholder(
  conversation: ChatConversation,
): string {
  if (conversation.kind === 'Workspace') {
    return 'Message workspace…';
  }

  return `Message ${conversation.name.toLowerCase()}…`;
}

/**
 * Chat (Module 11). Read-only coverage for the conversation sidebar, filters,
 * channel search, workspace/department/project switching, empty states, the
 * composer, formatting controls, and the search, new-channel, member, direct
 * message, emoji and mention surfaces. Messages are never sent and new channels
 * or direct messages are never submitted.
 */
export class ChatPage extends AppShellPage {
  readonly sidebarHeading: Locator;
  readonly searchInput: Locator;
  readonly filters: Locator;
  readonly conversationsNav: Locator;
  readonly conversationTitle: Locator;
  readonly conversationSummary: Locator;
  readonly conversationSearchButton: Locator;
  readonly showMembersButton: Locator;
  readonly emptyStateHint: Locator;
  readonly messageBox: Locator;
  readonly sendButton: Locator;
  readonly formattingToolbar: Locator;
  readonly attachButton: Locator;
  readonly attachInput: Locator;
  readonly mentionButton: Locator;
  readonly emojiButton: Locator;
  readonly newChannelDialog: Locator;
  readonly searchMessagesDialog: Locator;
  readonly mentionSuggestions: Locator;

  constructor(page: Page, options: ShellPageOptions = {}) {
    super(page, options);
    this.sidebarHeading = this.main.getByRole('heading', {
      name: 'Chat',
      level: 2,
      exact: true,
    });
    this.searchInput = this.main.getByRole('searchbox', {
      name: 'Search channels and direct messages',
    });
    this.filters = this.main.getByRole('radiogroup', { name: 'Show' });
    this.conversationsNav = this.main.getByRole('navigation', {
      name: 'Conversations',
    });
    this.conversationTitle = this.main.getByRole('heading', { level: 1 });
    this.conversationSummary = this.main.locator('header p').first();
    this.conversationSearchButton = this.main.getByRole('button', {
      name: 'Search this conversation',
      exact: true,
    });
    this.showMembersButton = this.main.getByRole('button', {
      name: SHOW_MEMBERS_BUTTON,
    });
    this.emptyStateHint = this.main.getByText(CHAT_EMPTY_HINT, {
      exact: true,
    });
    this.messageBox = this.main.getByRole('textbox', { name: 'Message' });
    this.sendButton = this.main.getByRole('button', {
      name: 'Send message',
      exact: true,
    });
    this.formattingToolbar = this.main.getByRole('toolbar', {
      name: 'Formatting',
    });
    this.attachButton = this.main.getByRole('button', {
      name: 'Attach files',
      exact: true,
    });
    this.attachInput = this.main.locator('input[type="file"]');
    this.mentionButton = this.main.getByRole('button', {
      name: 'Mention someone',
      exact: true,
    });
    this.emojiButton = this.main.getByRole('button', {
      name: 'Add emoji',
      exact: true,
    });
    this.newChannelDialog = page.getByRole('dialog', {
      name: NEW_CHANNEL_NAME,
    });
    this.searchMessagesDialog = page.getByRole('dialog', {
      name: SEARCH_MESSAGES_NAME,
    });
    this.mentionSuggestions = this.main.getByRole('listbox', {
      name: 'Mention suggestions',
    });
  }

  async goto(): Promise<void> {
    const sidebarRequests = Promise.all([
      this.waitForSidebarRequest('teams'),
      this.waitForSidebarRequest('channels'),
      this.waitForSidebarRequest('dm'),
    ]);

    await this.gotoAuthenticated(this.workspaceHref('/chat'));
    await sidebarRequests;
    await this.waitForShell();
    await expect(this.sidebarHeading).toBeVisible();
    await expect(this.conversationTitle).toBeVisible();
    await expect(this.conversationSummary).toBeVisible();
    await this.waitForConversationList();
  }

  private async waitForSidebarRequest(
    resource: 'teams' | 'channels' | 'dm',
  ): Promise<void> {
    const path = new RegExp(
      `^/api/v1/workspaces/[^/]+/${resource}$`,
    );

    await this.page
      .waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          path.test(new URL(response.url()).pathname),
        { timeout: 20000 },
      )
      .catch(() => undefined);
  }

  async waitForConversationList(): Promise<void> {
    await expect(
      this.conversationsNav.locator('[data-slot="skeleton"]'),
      'Conversation sidebar should finish loading',
    ).toHaveCount(0);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.sidebarHeading).toBeVisible();
    await expect(this.searchInput).toBeVisible();
    await expect(this.filters).toBeVisible();

    for (const filter of CHAT_FILTERS) {
      await expect(
        this.main.getByRole('radio', { name: filter, exact: true }),
      ).toBeVisible();
    }

    await expect(this.conversationsNav).toBeVisible();
    await this.waitForConversationList();
    await expect(this.conversationTitle).toBeVisible();
    await expect(this.conversationSummary).toBeVisible();

    const summary = await this.conversationSummaryText();
    expect(summary, 'Conversation member summary').toMatch(
      MEMBER_SUMMARY_PATTERN,
    );

    await expect(this.conversationSearchButton).toBeVisible();
    await expect(this.showMembersButton).toBeVisible();
    await this.expectComposerReady();
    await expect(this.attachInput).toHaveCount(1);
    await expect(this.attachInput).toHaveAttribute(
      'accept',
      /image\/png.*application\/pdf/,
    );
    await this.expectNoBrokenValues();
  }

  async conversations(): Promise<ChatConversation[]> {
    return this.conversationsNav.getByRole('link').evaluateAll((links) =>
      links.map((link) => {
        const leafText = Array.from(link.querySelectorAll('span'))
          .filter((span) => span.children.length === 0)
          .map((span) => (span.textContent ?? '').replace(/\s+/g, ' ').trim())
          .filter(Boolean);

        return {
          name: leafText[0] ?? '',
          kind: leafText[1] ?? '',
          href: link.getAttribute('href') ?? '',
          current: link.getAttribute('aria-current') === 'page',
        };
      }),
    );
  }

  async filterBy(filter: ChatFilter): Promise<void> {
    const radio = this.main.getByRole('radio', {
      name: filter,
      exact: true,
    });

    await radio.click();
    await expect(radio).toHaveAttribute('aria-checked', 'true');
  }

  async searchConversations(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await expect(this.searchInput).toHaveValue(query);
  }

  async expectNoSearchMatches(query: string): Promise<void> {
    await expect(
      this.conversationsNav.getByText(
        new RegExp(`Nothing matches .${escapeRegExp(query)}.`),
      ),
    ).toBeVisible();
  }

  async openConversation(href: string): Promise<void> {
    await this.conversationLink(href).click();
    await expect(this.page).toHaveURL(new RegExp(`${escapeRegExp(href)}$`));
    await expect(this.conversationTitle).toBeVisible();
    await expect(this.conversationTitle).not.toHaveText('');
    await expect(this.conversationSummary).toBeVisible();
  }

  async expectActiveConversation(href: string): Promise<void> {
    await expect(this.conversationLink(href)).toHaveAttribute(
      'aria-current',
      'page',
    );
  }

  async conversationTitleText(): Promise<string> {
    return normalize(await this.conversationTitle.innerText());
  }

  async conversationSummaryText(): Promise<string> {
    return normalize(await this.conversationSummary.innerText());
  }

  async composerPlaceholder(): Promise<string> {
    const placeholder = this.messageBox
      .locator('p[data-placeholder]')
      .first();

    return normalize((await placeholder.getAttribute('data-placeholder')) ?? '');
  }

  async memberCount(): Promise<number> {
    const label = await this.showMembersButton.getAttribute('aria-label');
    const match = label?.match(/(\d+)/);

    if (!match) {
      throw new Error(`Unexpected members button label: "${label}"`);
    }

    return Number(match[1]);
  }

  async isEmptyConversation(): Promise<boolean> {
    return this.emptyStateHint.isVisible();
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyStateHint).toBeVisible();
    await expect(
      this.main.getByRole('heading', {
        level: 2,
        name: /^This is the start of /,
      }),
    ).toBeVisible();
    await expect(this.conversationSummary).toContainText(MEMBER_SUMMARY_PATTERN);
  }

  async expectComposerReady(): Promise<void> {
    await expect(this.messageBox).toBeVisible();
    await expect(this.sendButton).toBeVisible();
    await expect(this.sendButton).toBeDisabled();
    await expect(this.formattingToolbar).toBeVisible();
    await expect(this.attachButton).toBeVisible();
    await expect(this.mentionButton).toBeVisible();
    await expect(this.emojiButton).toBeVisible();
  }

  async composerText(): Promise<string> {
    return normalize(await this.messageBox.innerText());
  }

  async fillMessage(text: string): Promise<void> {
    await this.messageBox.fill(text);
    await expect
      .poll(async () => this.composerText(), {
        message: 'Composer should contain the typed draft',
      })
      .toBe(text);
    await expect(this.sendButton).toBeEnabled();
  }

  async clearMessage(): Promise<void> {
    await this.messageBox.fill('');
    await expect
      .poll(async () => this.composerText(), {
        message: 'Composer should be empty after clearing the draft',
      })
      .toBe('');
    await expect(this.sendButton).toBeDisabled();
  }

  async isSendDisabled(): Promise<boolean> {
    return this.sendButton.isDisabled();
  }

  async hideFormatting(): Promise<void> {
    await this.main
      .getByRole('button', { name: 'Hide formatting', exact: true })
      .click();
    await expect(this.formattingToolbar).toBeHidden();
    await expect(
      this.main.getByRole('button', { name: 'Show formatting', exact: true }),
    ).toHaveAttribute('aria-pressed', 'false');
  }

  async showFormatting(): Promise<void> {
    await this.main
      .getByRole('button', { name: 'Show formatting', exact: true })
      .click();
    await expect(this.formattingToolbar).toBeVisible();
  }

  async openNewChannelDialog(): Promise<void> {
    await this.main
      .locator('button[aria-label="New channel"]:visible')
      .first()
      .click();
    await expect(this.newChannelDialog).toBeVisible();
  }

  async expectNewChannelDialog(): Promise<void> {
    await expect(this.newChannelDialog).toBeVisible();
    await expect(
      this.newChannelDialog.getByRole('heading', {
        name: 'New channel',
        exact: true,
      }),
    ).toBeVisible();
    await expect(this.newChannelDialog).toContainText(
      'A chat room for a specific group of people, separate from any department.',
    );
    await expect(this.newChannelDialog.getByLabel('Name')).toBeVisible();
    await expect(
      this.newChannelDialog.getByLabel(/^Description/),
    ).toBeVisible();
    await expect(
      this.newChannelDialog.getByRole('button', {
        name: 'Add people',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      this.newChannelDialog.getByRole('button', {
        name: 'Cancel',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      this.newChannelDialog.getByRole('button', {
        name: 'Create channel',
        exact: true,
      }),
    ).toBeVisible();
  }

  async cancelNewChannelDialog(): Promise<void> {
    await this.newChannelDialog
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await expect(this.newChannelDialog).toBeHidden();
  }

  async openSearchMessagesDialog(
    source: 'sidebar' | 'conversation',
  ): Promise<void> {
    const button =
      source === 'sidebar'
        ? this.main.getByRole('button', {
            name: 'Search messages',
            exact: true,
          })
        : this.conversationSearchButton;

    await button.click();
    await expect(this.searchMessagesDialog).toBeVisible();
  }

  async expectSearchMessagesDialog(): Promise<void> {
    await expect(this.searchMessagesDialog).toBeVisible();
    await expect(
      this.searchMessagesDialog.getByRole('heading', {
        name: 'Search messages',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      this.searchMessagesDialog.getByRole('textbox', {
        name: 'Search words',
      }),
    ).toBeVisible();
    await expect(
      this.searchMessagesDialog.getByRole('combobox', {
        name: 'In',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      this.searchMessagesDialog.getByRole('combobox', {
        name: 'From',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      this.searchMessagesDialog.getByRole('button', {
        name: 'Search',
        exact: true,
      }),
    ).toBeDisabled();
    await expect(this.searchMessagesDialog).toContainText(
      'Type at least two characters and press Enter.',
    );
  }

  async searchMessagesContext(): Promise<string> {
    return normalize(
      await this.searchMessagesDialog
        .getByRole('combobox', { name: 'In', exact: true })
        .innerText(),
    );
  }

  async closeSearchMessagesDialog(): Promise<void> {
    await this.searchMessagesDialog
      .getByRole('button', { name: 'Close', exact: true })
      .click();
    await expect(this.searchMessagesDialog).toBeHidden();
  }

  async openMembers(): Promise<ChatMember[]> {
    await this.showMembersButton.click();
    await this.visiblePopover().waitFor({ state: 'visible' });
    await expect(this.visiblePopover()).toContainText(/Members · \d+/);

    const members = await this.visiblePopover()
      .getByRole('list', { name: 'Members' })
      .getByRole('listitem')
      .evaluateAll((items) =>
        items.map((item) => {
          const nameBlock = item.querySelector('span.min-w-0');
          const spans = Array.from(nameBlock?.children ?? []).map((span) =>
            (span.textContent ?? '').replace(/\s+/g, ' ').trim(),
          );
          const role = Array.from(item.children)
            .filter(
              (child) =>
                child.tagName === 'SPAN' &&
                !child.hasAttribute('data-slot') &&
                child !== nameBlock,
            )
            .map((span) =>
              (span.textContent ?? '').replace(/\s+/g, ' ').trim(),
            )
            .find(Boolean);

          return {
            name: spans[0] ?? '',
            detail: spans[1] ?? '',
            role: role ?? null,
          };
        }),
      );

    await this.closePopover();

    return members;
  }

  async openNewDirectMessage(): Promise<ChatDirectMessageOption[]> {
    await this.main
      .locator('button[aria-label="New direct message"]:visible')
      .first()
      .click();

    const popover = this.visiblePopover();
    await popover.waitFor({ state: 'visible' });
    await expect(
      popover.getByPlaceholder('Find a teammate…'),
    ).toBeVisible();
    await expect(popover).toContainText('Start a conversation');

    const options = await popover.getByRole('option').evaluateAll((items) =>
      items.map((item) => {
        const nameBlock = item.querySelector('span.min-w-0');
        const spans = Array.from(nameBlock?.children ?? []).map((span) =>
          (span.textContent ?? '').replace(/\s+/g, ' ').trim(),
        );

        return {
          name: spans[0] ?? '',
          detail: spans[1] ?? '',
        };
      }),
    );

    await this.closePopover();

    return options;
  }

  async openEmojiPicker(): Promise<ChatEmojiPicker> {
    await this.emojiButton.click();

    const popover = this.visiblePopover();
    await popover.waitFor({ state: 'visible' });
    const categories = await popover
      .locator('section[aria-label]')
      .evaluateAll((sections) =>
        sections
          .map((section) => section.getAttribute('aria-label') ?? '')
          .filter(Boolean),
      );
    const count = await popover.locator('button[aria-label]').count();

    await this.closePopover();

    return { categories, count };
  }

  async openMentionSuggestions(): Promise<string[]> {
    await this.mentionButton.click();
    await expect(this.mentionSuggestions).toBeVisible();
    await expect
      .poll(async () => this.composerText(), {
        message: 'Mention trigger should be inserted in the composer',
      })
      .toBe('@');

    return this.mentionSuggestions.getByRole('option').evaluateAll((options) =>
      options.map((option) => (option.textContent ?? '').replace(/\s+/g, ' ').trim()),
    );
  }

  async closeMentionSuggestions(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.mentionSuggestions).toBeHidden();
  }

  async expectNoBrokenValues(): Promise<void> {
    await expect(this.main).not.toContainText(
      /NaN|undefined|Invalid Date/,
    );
  }

  private conversationLink(href: string): Locator {
    return this.conversationsNav.locator(`a[href="${href}"]`);
  }

  private visiblePopover(): Locator {
    return this.page.locator('[data-slot="popover-content"]:visible').first();
  }

  private async closePopover(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(
      this.page.locator('[data-slot="popover-content"]:visible'),
    ).toHaveCount(0);
  }
}
