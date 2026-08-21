import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';

const sourceRoot = join(cwd(), 'src');
const productionFiles = (directory: string): string[] => readdirSync(directory).flatMap((entry) => {
  const path = join(directory, entry);
  return statSync(path).isDirectory() ? productionFiles(path) : /\.(ts|tsx)$/.test(path) && !/\.test\.(ts|tsx)$/.test(path) ? [path] : [];
});

describe('native browser interaction guard', () => {
  it('does not allow native prompt, confirm, or alert calls in production source', () => {
    const nativeCall = /(?:window\.)?(?:prompt|confirm|alert)\s*\(/;
    const violations = productionFiles(sourceRoot).filter((file) => nativeCall.test(readFileSync(file, 'utf8')));
    expect(violations).toEqual([]);
  });

  it('does not allow native select elements in production source', () => {
    const violations = productionFiles(sourceRoot).filter((file) => /<select\b|<\/select>/.test(readFileSync(file, 'utf8')));
    expect(violations).toEqual([]);
  });
});
