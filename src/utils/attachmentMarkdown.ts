const escapeRegularExpression = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type ProcessedLine = { value: string; changed: boolean; isFence: boolean };

const isEscaped = (value: string, index: number) => {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === '\\'; cursor -= 1) slashCount += 1;
  return slashCount % 2 === 1;
};

const removeFromText = (value: string, reference: RegExp) => {
  let changed = false;
  const next = value.replace(reference, (match, offset: number, source: string) => {
    if (isEscaped(source, offset)) return match;
    changed = true;
    return '';
  });
  return { value: next, changed };
};

/** Removes references from prose while leaving inline-code spans byte-for-byte intact. */
const removeOutsideInlineCode = (line: string, reference: RegExp) => {
  let position = 0;
  let output = '';
  let changed = false;
  const delimiter = /`+/g;
  let match: RegExpExecArray | null;

  while ((match = delimiter.exec(line))) {
    const before = removeFromText(line.slice(position, match.index), reference);
    output += before.value;
    changed ||= before.changed;

    const closingIndex = line.indexOf(match[0], delimiter.lastIndex);
    if (closingIndex < 0) return { value: output + line.slice(match.index), changed };
    output += line.slice(match.index, closingIndex + match[0].length);
    position = closingIndex + match[0].length;
    delimiter.lastIndex = position;
  }

  const after = removeFromText(line.slice(position), reference);
  return { value: output + after.value, changed: changed || after.changed };
};

const normalizeChangedBlankLines = (lines: ProcessedLine[]) => {
  const normalized: ProcessedLine[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.isFence || !/^\s*$/.test(line.value)) {
      normalized.push(line);
      index += 1;
      continue;
    }

    const start = index;
    while (index < lines.length && !lines[index].isFence && /^\s*$/.test(lines[index].value)) index += 1;
    const blankRun = lines.slice(start, index);
    if (!blankRun.some((item) => item.changed)) {
      normalized.push(...blankRun);
      continue;
    }

    // Keep at most one pre-existing blank line. A newly-empty attachment-only
    // line should not add vertical whitespace to the surrounding Markdown.
    const existingBlankLine = blankRun.find((item) => !item.changed);
    if (existingBlankLine) normalized.push(existingBlankLine);
  }
  return normalized;
};

/**
 * Removes only active, application-owned Markdown image references for one
 * deleted attachment. It deliberately ignores fenced code, inline code, and
 * escaped image syntax so examples and literal documentation remain intact.
 */
export const removeAttachmentMarkdownReferences = (markdown: string, attachmentId: string) => {
  const escapedId = escapeRegularExpression(attachmentId);
  const reference = new RegExp(
    String.raw`!\[(?:\\.|[^\]\\\r\n])*\]\(\s*attachment://${escapedId}\s*\)`,
    'g',
  );
  const newline = markdown.includes('\r\n') ? '\r\n' : '\n';
  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  let changed = false;
  const processed = lines.map((line) => {
    const isFence = /^\s*(?:`{3,}|~{3,})/.test(line);
    if (isFence) {
      inFence = !inFence;
      return { value: line, changed: false, isFence: true };
    }
    if (inFence) return { value: line, changed: false, isFence: false };
    const result = removeOutsideInlineCode(line, reference);
    changed ||= result.changed;
    return { ...result, isFence: false };
  });

  if (!changed) return markdown;
  return normalizeChangedBlankLines(processed).map((line) => line.value).join(newline);
};
