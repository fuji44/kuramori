import { assertEquals } from '@std/assert';
import { getInitial, getPalette } from './UserAvatar.tsx';
import type { CurrentUser } from '../types.ts';

Deno.test('UserAvatar - getInitial extracts first character of name capitalized', () => {
  const user: CurrentUser = {
    login: 'octocat',
    name: 'The Octocat',
  };
  assertEquals(getInitial(user), 'T');
});

Deno.test('UserAvatar - getInitial falls back to login when name is absent or empty', () => {
  const userWithoutName: CurrentUser = {
    login: 'fuji44',
    name: null,
  };
  assertEquals(getInitial(userWithoutName), 'F');

  const userWithEmptyName: CurrentUser = {
    login: 'antigravity',
    name: '   ',
  };
  assertEquals(getInitial(userWithEmptyName), 'A');
});

Deno.test('UserAvatar - getInitial handles multibyte or unicode characters properly', () => {
  const user: CurrentUser = {
    login: 'tanaka',
    name: '田中 太郎',
  };
  assertEquals(getInitial(user), '田');
});

Deno.test('UserAvatar - getPalette returns deterministic styling for same username', () => {
  const color1 = getPalette('octocat');
  const color2 = getPalette('octocat');
  assertEquals(color1, color2);
  assertEquals(typeof color1, 'string');
});
