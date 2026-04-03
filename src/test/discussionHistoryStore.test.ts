import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteDiscussionFromHistory,
  getDiscussionHistory,
  saveDiscussionToHistory,
  upsertDiscussionHistory,
} from '@/lib/discussionHistoryStore';
import type { DiscussionMessage } from '@/types/expert';

function createMessage(content: string): DiscussionMessage {
  return {
    id: `msg-${content}`,
    expertId: 'gpt',
    content,
  };
}

function createRecord(overrides?: Partial<Parameters<typeof saveDiscussionToHistory>[0]>) {
  return {
    question: 'test question',
    mode: 'general' as const,
    messages: [createMessage('hello')],
    expertIds: ['gpt'],
    ...overrides,
  };
}

describe('discussionHistoryStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves new discussions at the front and caps history at 20 records', () => {
    const nowSpy = vi.spyOn(Date, 'now');

    for (let index = 0; index < 22; index += 1) {
      nowSpy.mockReturnValueOnce(1000 + index);
      saveDiscussionToHistory(createRecord({ question: `question-${index}` }));
    }

    const history = getDiscussionHistory();

    expect(history).toHaveLength(20);
    expect(history[0]?.question).toBe('question-21');
    expect(history[19]?.question).toBe('question-2');
  });

  it('upserts an existing record without duplicating it', () => {
    localStorage.setItem('ai-debate-history-v1', JSON.stringify([
      {
        id: 'hist-existing',
        question: 'old question',
        mode: 'general',
        messages: [createMessage('old')],
        expertIds: ['gpt'],
        timestamp: 100,
      },
    ]));

    upsertDiscussionHistory('hist-existing', createRecord({
      question: 'updated question',
      messages: [createMessage('updated')],
    }));

    const history = getDiscussionHistory();

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      id: 'hist-existing',
      question: 'updated question',
      messages: [createMessage('updated')],
      timestamp: 100,
    });
  });

  it('deletes a record by id and ignores malformed persisted data', () => {
    localStorage.setItem('ai-debate-history-v1', JSON.stringify([
      {
        id: 'hist-1',
        question: 'keep',
        mode: 'general',
        messages: [createMessage('keep')],
        expertIds: ['gpt'],
        timestamp: 100,
      },
      {
        id: 'hist-2',
        question: 'remove',
        mode: 'general',
        messages: [createMessage('remove')],
        expertIds: ['gpt'],
        timestamp: 101,
      },
    ]));

    deleteDiscussionFromHistory('hist-2');

    expect(getDiscussionHistory()).toHaveLength(1);
    expect(getDiscussionHistory()[0]?.id).toBe('hist-1');

    localStorage.setItem('ai-debate-history-v1', '{bad json');
    expect(getDiscussionHistory()).toEqual([]);
  });

  it('filters malformed records and malformed nested messages from persisted history', () => {
    localStorage.setItem('ai-debate-history-v1', JSON.stringify([
      {
        id: 'hist-valid',
        question: 'valid',
        mode: 'general',
        messages: [
          createMessage('keep'),
          { id: 'bad-message', expertId: 'gpt' },
        ],
        expertIds: ['gpt'],
        timestamp: 200,
        proconStances: { gpt: 'pro', bad: 'maybe' },
      },
      {
        id: 123,
        question: 'invalid',
        mode: 'general',
        messages: [createMessage('bad')],
        expertIds: ['gpt'],
        timestamp: 201,
      },
    ]));

    expect(getDiscussionHistory()).toEqual([
      {
        id: 'hist-valid',
        question: 'valid',
        mode: 'general',
        messages: [createMessage('keep')],
        expertIds: ['gpt'],
        timestamp: 200,
        proconStances: { gpt: 'pro' },
      },
    ]);
  });
});
