import { expect, test } from 'vitest';
import { nextCursorFrom } from './pagination';

const cases: [unknown, string | null][] = [
  [{ nextCursor: 'CaseSensitive+/=?' }, 'CaseSensitive+/=?'],
  [{ pageInfo: { nextCursor: 'nested-cursor' } }, 'nested-cursor'],
  [
    { nextCursor: null, pageInfo: { nextCursor: 'nested-cursor' } },
    'nested-cursor',
  ],
  [{ nextCursor: '' }, ''],
  [{ nextCursor: 42 }, null],
  [{ pageInfo: 'invalid' }, null],
  [null, null],
  [[], null],
  [undefined, null],
];

test.each(cases)(
  'normalizes an opaque cursor without asserting an unknown payload',
  (data, expected) => {
    expect(nextCursorFrom(data)).toBe(expected);
  },
);
