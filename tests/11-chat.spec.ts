import { test, expect } from '../fixtures/pages.fixture';
import {
  CHAT_FILTERS,
  conversationHeading,
  conversationPlaceholder,
} from '../pages/ChatPage';

/**
 * Module 11 — Chat.
 *
 * Read-only coverage: the conversation sidebar and filters, channel/member
 * search, workspace/department/project conversation switching, empty states,
 * composer and formatting controls, the new-channel and message-search dialogs,
 * member/direct-message popovers, emoji picker and mention suggestions. No
 * message is sent, no direct message is started and no channel is created.
 *
 * Run: npm run test:modules:chrome -- tests/11-chat.spec.ts
 */
test.describe('Chat (Module 11)', () => {
  test('loads the workspace conversation, sidebar and composer', async ({
    chatPage,
  }) => {
    await chatPage.goto();

    await chatPage.expectTitle(/Chat .+ TaskForge/i);
    await chatPage.expectPath(chatPage.workspaceHref('/chat'));
    await chatPage.expectLoaded();

    const conversations = await chatPage.conversations();
    const workspace = conversations.filter(
      (conversation) => conversation.kind === 'Workspace',
    );
    const active = conversations.filter(
      (conversation) => conversation.current,
    );

    expect(
      conversations.length,
      'Conversation links in the sidebar',
    ).toBeGreaterThan(0);
    expect(workspace, 'Workspace conversation').toHaveLength(1);
    expect(active, 'Active conversation').toHaveLength(1);
    expect(active[0].kind, 'Active conversation kind').toBe('Workspace');
    await expect(chatPage.conversationTitle).toHaveText(
      conversationHeading(active[0]),
    );
    expect(
      await chatPage.memberCount(),
      'Member count in the conversation header',
    ).toBeGreaterThan(0);
    await chatPage.expectNoBrokenValues();
  });

  test('filters conversations and searches channels without changing data', async ({
    chatPage,
  }) => {
    await chatPage.goto();

    const all = await chatPage.conversations();

    test.skip(all.length === 0, 'The workspace has no conversations.');

    expect(all.length, 'All conversations').toBeGreaterThan(0);

    for (const filter of CHAT_FILTERS) {
      await chatPage.filterBy(filter);

      const filtered = await chatPage.conversations();

      if (filter === 'Direct') {
        expect(
          filtered.every((conversation) => conversation.kind === 'Direct'),
          'Direct filter only shows direct messages',
        ).toBe(true);
      } else {
        expect(
          filtered.every((conversation) => conversation.kind !== 'Direct'),
          `${filter} filter hides direct messages`,
        ).toBe(true);
      }
    }

    await chatPage.filterBy('All');
    expect(await chatPage.conversations()).toEqual(all);

    const target =
      all.find((conversation) => conversation.kind === 'Department') ?? all[0];

    await chatPage.searchConversations(target.name);
    await expect
      .poll(
        async () =>
          (await chatPage.conversations()).some(
            (conversation) => conversation.href === target.href,
          ),
        { message: 'Matching conversation should remain in the sidebar' },
      )
      .toBe(true);

    await chatPage.searchConversations('zzzz-no-match');
    await expect
      .poll(async () => (await chatPage.conversations()).length, {
        message: 'Impossible search should return no conversations',
      })
      .toBe(0);
    await chatPage.expectNoSearchMatches('zzzz-no-match');

    await chatPage.searchConversations('');
    expect(await chatPage.conversations()).toEqual(all);
  });

  test('switches between workspace, department and project conversations', async ({
    chatPage,
  }) => {
    await chatPage.goto();

    const conversations = await chatPage.conversations();

    test.skip(
      conversations.length < 2,
      'The workspace has only one conversation.',
    );

    for (const conversation of conversations) {
      await chatPage.openConversation(conversation.href);
      await chatPage.expectActiveConversation(conversation.href);

      await expect(chatPage.conversationTitle).toHaveText(
        conversationHeading(conversation),
      );
      expect(
        await chatPage.conversationSummaryText(),
        `${conversation.name} member summary`,
      ).toMatch(/^\d+ members? · /);
      expect(
        await chatPage.composerPlaceholder(),
        `${conversation.name} composer placeholder`,
      ).toBe(conversationPlaceholder(conversation));
    }

    const workspace = conversations.find(
      (conversation) => conversation.kind === 'Workspace',
    );

    if (workspace) {
      await chatPage.openConversation(workspace.href);
    }
  });

  test('shows the empty state and gates the composer on a draft', async ({
    chatPage,
  }) => {
    await chatPage.goto();

    test.skip(
      !(await chatPage.isEmptyConversation()),
      'This conversation already has messages.',
    );

    await chatPage.expectEmptyState();
    await chatPage.expectComposerReady();

    await chatPage.fillMessage('QA read-only composer check');
    expect(await chatPage.isSendDisabled()).toBe(false);

    await chatPage.clearMessage();
    expect(await chatPage.isSendDisabled()).toBe(true);
    await expect(chatPage.emptyStateHint).toBeVisible();

    await chatPage.hideFormatting();
    await chatPage.showFormatting();
    await chatPage.expectNoBrokenValues();
  });

  test('opens the new-channel dialog and cancels without creating a channel', async ({
    chatPage,
  }) => {
    await chatPage.goto();

    const before = await chatPage.conversations();

    await chatPage.openNewChannelDialog();
    await chatPage.expectNewChannelDialog();
    await chatPage.cancelNewChannelDialog();

    expect(
      await chatPage.conversations(),
      'Cancelling must not create a channel',
    ).toEqual(before);
  });

  test('opens message search globally and scoped to the conversation', async ({
    chatPage,
  }) => {
    await chatPage.goto();

    const conversations = await chatPage.conversations();
    const workspace = conversations.find(
      (conversation) => conversation.kind === 'Workspace',
    );

    await chatPage.openSearchMessagesDialog('sidebar');
    await chatPage.expectSearchMessagesDialog();
    expect(
      await chatPage.searchMessagesContext(),
      'Sidebar search scope',
    ).toBe('All conversations');
    await chatPage.closeSearchMessagesDialog();

    await chatPage.openSearchMessagesDialog('conversation');
    await chatPage.expectSearchMessagesDialog();
    expect(
      await chatPage.searchMessagesContext(),
      'Conversation search scope',
    ).toBe(workspace?.name);
    await chatPage.closeSearchMessagesDialog();
  });

  test('shows members and starts a direct-message picker without submitting', async ({
    chatPage,
  }) => {
    await chatPage.goto();

    const declaredCount = await chatPage.memberCount();
    const members = await chatPage.openMembers();

    expect(members, 'Members popover entries').toHaveLength(declaredCount);
    expect(
      members.every((member) => member.name && member.detail),
      'Every member has a name and email',
    ).toBe(true);
    expect(
      members.some((member) => member.role === 'Owner'),
      'Workspace owner is listed',
    ).toBe(true);

    const owner = members.find((member) => member.role === 'Owner');
    const directMessageOptions = await chatPage.openNewDirectMessage();

    expect(
      directMessageOptions.length,
      'Direct-message picker options',
    ).toBeGreaterThan(0);
    expect(
      directMessageOptions.every((option) => option.name && option.detail),
      'Every direct-message option has a name and email',
    ).toBe(true);

    if (owner) {
      expect(
        directMessageOptions.some(
          (option) => option.detail === owner.detail,
        ),
        'The current owner is not offered as a direct message',
      ).toBe(false);
    }
  });

  test('opens the emoji picker and mention suggestions without sending', async ({
    chatPage,
  }) => {
    await chatPage.goto();

    const picker = await chatPage.openEmojiPicker();

    expect(
      picker.categories,
      'Emoji picker categories',
    ).toEqual(expect.arrayContaining(['Smileys', 'Gestures', 'Work']));
    expect(
      picker.categories.some((category) => /^Hearts & symbols$/i.test(category)),
      'Emoji picker includes the hearts category',
    ).toBe(true);
    expect(picker.count, 'Emoji options').toBeGreaterThan(0);

    const suggestions = await chatPage.openMentionSuggestions();

    expect(await chatPage.composerText()).toBe('@');
    expect(suggestions.length, 'Mention suggestions').toBeGreaterThan(0);
    expect(
      suggestions.some((suggestion) => suggestion.includes('Everyone')),
      'Mention suggestions include Everyone',
    ).toBe(true);
    expect(
      await chatPage.isSendDisabled(),
      'A mention trigger is only a draft',
    ).toBe(false);

    await chatPage.closeMentionSuggestions();
  });
});
