export interface FormattedEdit {
  readonly text: string;
  readonly caret: number;
}

export function commonPrefix(left: string, right: string): number {
  let length = 0;
  while (length < left.length && length < right.length && left[length] === right[length]) length++;
  return length;
}

export function commonSuffix(left: string, right: string, prefix: number): number {
  let length = 0;
  while (
    length < left.length - prefix &&
    length < right.length - prefix &&
    left[left.length - 1 - length] === right[right.length - 1 - length]
  ) {
    length++;
  }
  return length;
}

function countMatches(text: string, significant: RegExp): number {
  let count = 0;
  for (const character of text) if (significant.test(character)) count++;
  return count;
}

function caretAfter(text: string, count: number, significant: RegExp): number {
  let seen = 0;
  for (let index = 0; index < text.length; index++) {
    if (!significant.test(text[index] ?? '')) continue;
    if (seen === count) return index;
    seen++;
  }
  return text.length;
}

export function applyEdit(
  previous: string,
  next: string,
  format: (typed: string) => string,
  significant: RegExp,
): FormattedEdit {
  const prefix = commonPrefix(previous, next);
  const suffix = commonSuffix(previous, next, prefix);
  const removed = previous.slice(prefix, previous.length - suffix);
  const inserted = next.slice(prefix, next.length - suffix);

  let typed = next;
  let caret = next.length - suffix;
  if (!inserted && removed && countMatches(removed, significant) === 0) {
    const before = previous.slice(0, prefix);
    let last = before.length - 1;
    while (last >= 0 && !significant.test(before[last] ?? '')) last--;
    if (last >= 0) {
      typed = before.slice(0, last) + previous.slice(last + 1);
      caret = last;
    }
  }

  const count = countMatches(typed.slice(0, caret), significant);
  const text = format(typed);
  return {
    text,
    caret: count === countMatches(text, significant) ? text.length : caretAfter(text, count, significant),
  };
}
