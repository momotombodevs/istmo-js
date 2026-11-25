import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as istmo from '../src';

const readme = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8');
const EXAMPLE = /^([a-zA-Z]+\(.*\)(?:\??\.[a-zA-Z]+)*);?\s*\/\/\s*("[^"]*"|true|false|null|-?\d+)/;
const examples = [...readme.matchAll(/```ts\n([\s\S]*?)```/g)]
  .flatMap(([, block]) => (block ?? '').split('\n'))
  .map((line) => EXAMPLE.exec(line.trim()))
  .filter((match): match is RegExpExecArray => match !== null)
  .map(([, call, expected]) => ({ call: call ?? '', expected: expected ?? '' }));

const run = new Function(...Object.keys(istmo), 'call', 'return eval(call)') as (...args: unknown[]) => unknown;

describe('README examples', () => {
  it('has examples to check', () => {
    expect(examples.length).toBeGreaterThan(20);
  });

  it.each(examples)('$call', ({ call, expected }) => {
    const result = run(...Object.values(istmo), call);
    const wanted = JSON.parse(expected.replace(/^"(.*)"$/, (_, text: string) => JSON.stringify(text)));
    expect(typeof result === 'string' ? result.replaceAll(' ', ' ') : result).toBe(
      typeof wanted === 'string' ? wanted.replaceAll(' ', ' ') : wanted,
    );
  });
});
