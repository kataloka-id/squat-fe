import { describe, expect, it } from 'vitest';
import { removeAttachmentMarkdownReferences } from './attachmentMarkdown.ts';

const deletedId = '9896259b-3ace-45e3-9760-95830b04a6b3';
const otherId = '46fca483-f28b-43da-9476-5c7e9d0cfc08';

describe('removeAttachmentMarkdownReferences', () => {
  it('removes every matching internal image reference and cleans the resulting blank lines', () => {
    expect(
      removeAttachmentMarkdownReferences(
        `Before\n\n![file name, v2\\].png](attachment://${deletedId})\n\nAfter\n![again](attachment://${deletedId})`,
        deletedId,
      ),
    ).toBe('Before\n\nAfter');
  });

  it('preserves other attachments, external images, and unrelated Markdown', () => {
    const markdown = `**Keep**\n![other](attachment://${otherId})\n![external](https://example.com/image.png)\n![remove](attachment://${deletedId})`;
    expect(removeAttachmentMarkdownReferences(markdown, deletedId)).toBe(
      `**Keep**\n![other](attachment://${otherId})\n![external](https://example.com/image.png)`,
    );
  });

  it('does not change Markdown that has no matching attachment reference', () => {
    const markdown = `![other](attachment://${otherId})\n\nText`;
    expect(removeAttachmentMarkdownReferences(markdown, deletedId)).toBe(markdown);
  });

  it('preserves fenced code, inline code, and escaped image-like references', () => {
    const markdown = [
      'Use `![inline](attachment://9896259b-3ace-45e3-9760-95830b04a6b3)` as an example.',
      '\\![escaped](attachment://9896259b-3ace-45e3-9760-95830b04a6b3)',
      '```md',
      '![fenced](attachment://9896259b-3ace-45e3-9760-95830b04a6b3)',
      '```',
      `![active](attachment://${deletedId})`,
    ].join('\n');
    expect(removeAttachmentMarkdownReferences(markdown, deletedId)).toBe([
      'Use `![inline](attachment://9896259b-3ace-45e3-9760-95830b04a6b3)` as an example.',
      '\\![escaped](attachment://9896259b-3ace-45e3-9760-95830b04a6b3)',
      '```md',
      '![fenced](attachment://9896259b-3ace-45e3-9760-95830b04a6b3)',
      '```',
    ].join('\n'));
  });
});
