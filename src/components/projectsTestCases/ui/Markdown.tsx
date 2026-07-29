import React, { useRef, useState } from 'react';
import { Bold, Code, Italic, Link, List, ListOrdered, Quote } from 'lucide-react';

type MarkdownEditorProps = {
  id: string;
  label: string;
  value: string;
  // eslint-disable-next-line no-unused-vars -- TypeScript callback parameter, not a runtime binding.
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  className?: string;
};

type InlinePart = { type: 'text'; value: string } | { type: 'code'; value: string } | { type: 'link'; label: string; href: string } | { type: 'bold' | 'italic'; value: string };

const safeHref = (value: string) => {
  const href = value.trim();
  return /^(https?:|mailto:|\/|#)/i.test(href) ? href : null;
};

const inlineParts = (value: string): InlinePart[] => {
  const expression = /(`[^`]*`|\[[^\]]+\]\([^)]*\)|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts: InlinePart[] = [];
  let cursor = 0;
  for (const match of value.matchAll(expression)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ type: 'text', value: value.slice(cursor, index) });
    if (token.startsWith('`')) parts.push({ type: 'code', value: token.slice(1, -1) });
    else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)]*)\)$/.exec(token);
      const href = link ? safeHref(link[2]) : null;
      parts.push(href && link ? { type: 'link', label: link[1], href } : { type: 'text', value: token });
    } else if (token.startsWith('**')) parts.push({ type: 'bold', value: token.slice(2, -2) });
    else parts.push({ type: 'italic', value: token.slice(1, -1) });
    cursor = index + token.length;
  }
  if (cursor < value.length) parts.push({ type: 'text', value: value.slice(cursor) });
  return parts;
};

const InlineMarkdown = ({ value }: { value: string }) => (
  <>
    {inlineParts(value).map((part, index) => {
      if (part.type === 'code') return <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em]" key={index}>{part.value}</code>;
      if (part.type === 'bold') return <strong key={index}>{part.value}</strong>;
      if (part.type === 'italic') return <em key={index}>{part.value}</em>;
      if (part.type === 'link') return <a className="text-brand-700 underline underline-offset-2" href={part.href} key={index} rel="noreferrer" target="_blank">{part.label}</a>;
      return <React.Fragment key={index}>{part.value}</React.Fragment>;
    })}
  </>
);

/** Renders a deliberately small Markdown subset as React nodes, never user HTML. */
export const MarkdownContent = ({ value, className = '' }: { value?: string | null; className?: string }) => {
  if (!value) return null;
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    if (lines[index].startsWith('```')) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push(<pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100" key={blocks.length}><code>{code.join('\n')}</code></pre>);
      continue;
    }
    if (lines[index].startsWith('> ')) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].startsWith('> ')) quote.push(lines[index++].slice(2));
      blocks.push(<blockquote className="border-l-4 border-slate-200 pl-3 text-slate-600" key={blocks.length}>{quote.map((line, lineIndex) => <React.Fragment key={lineIndex}><InlineMarkdown value={line} />{lineIndex < quote.length - 1 && <br />}</React.Fragment>)}</blockquote>);
      continue;
    }
    const unordered = /^[-*+]\s+(.+)$/.exec(lines[index]);
    const ordered = /^\d+\.\s+(.+)$/.exec(lines[index]);
    if (unordered || ordered) {
      const items: string[] = [];
      const matcher = ordered ? /^\d+\.\s+(.+)$/ : /^[-*+]\s+(.+)$/;
      while (index < lines.length) {
        const item = matcher.exec(lines[index]);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(<Tag className={ordered ? 'list-decimal space-y-1 pl-5' : 'list-disc space-y-1 pl-5'} key={blocks.length}>{items.map((item, itemIndex) => <li key={itemIndex}><InlineMarkdown value={item} /></li>)}</Tag>);
      continue;
    }
    if (!lines[index].trim()) { index += 1; continue; }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !lines[index].startsWith('```') && !lines[index].startsWith('> ') && !/^([-*+]\s+|\d+\.\s+)/.test(lines[index])) paragraph.push(lines[index++]);
    blocks.push(<p key={blocks.length}>{paragraph.map((line, lineIndex) => <React.Fragment key={lineIndex}><InlineMarkdown value={line} />{lineIndex < paragraph.length - 1 && <br />}</React.Fragment>)}</p>);
  }
  return <div className={`space-y-2 break-words ${className}`}>{blocks}</div>;
};

export const MarkdownEditor = ({ id, label, value, onChange, placeholder, required, maxLength, rows = 3, className = '' }: MarkdownEditorProps) => {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const apply = (before: string, after = before, fallback = 'text') => {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };
  const applyLinePrefix = (prefix: string, fallback = 'list item') => {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const next = `${value.slice(0, start)}${prefix}${selected.replace(/\n/g, `\n${prefix}`)}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + prefix.length, start + prefix.length + selected.length + (selected.split('\n').length - 1) * prefix.length);
    });
  };
  const writeTabId = `${id}-write-tab`;
  const previewTabId = `${id}-preview-tab`;
  const writePanelId = `${id}-write-panel`;
  const previewPanelId = `${id}-preview-panel`;
  const toolbarButtonClassName = 'rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
  const preserveSelection = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();
  return <div className={`rounded-lg border border-slate-200 bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-2 py-1.5">
      <div aria-label={`${label} editor mode`} className="flex" role="tablist">
        <button aria-controls={writePanelId} aria-selected={mode === 'write'} className={`rounded px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${mode === 'write' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}`} id={writeTabId} onClick={() => setMode('write')} role="tab" type="button">Write</button>
        <button aria-controls={previewPanelId} aria-selected={mode === 'preview'} className={`rounded px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${mode === 'preview' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}`} id={previewTabId} onClick={() => setMode('preview')} role="tab" type="button">Preview</button>
      </div>
      {mode === 'write' && <div aria-label={`${label} formatting`} className="flex flex-wrap gap-0.5" role="toolbar">
        <button aria-label="Bold" className={toolbarButtonClassName} onClick={() => apply('**', '**', 'bold text')} onMouseDown={preserveSelection} title="Bold" type="button"><Bold aria-hidden="true" size={15} /></button>
        <button aria-label="Italic" className={toolbarButtonClassName} onClick={() => apply('*', '*', 'italic text')} onMouseDown={preserveSelection} title="Italic" type="button"><Italic aria-hidden="true" size={15} /></button>
        <button aria-label="Bulleted list" className={toolbarButtonClassName} onClick={() => applyLinePrefix('- ')} onMouseDown={preserveSelection} title="Bulleted list" type="button"><List aria-hidden="true" size={15} /></button>
        <button aria-label="Numbered list" className={toolbarButtonClassName} onClick={() => applyLinePrefix('1. ')} onMouseDown={preserveSelection} title="Numbered list" type="button"><ListOrdered aria-hidden="true" size={15} /></button>
        <button aria-label="Inline code" className={toolbarButtonClassName} onClick={() => apply('`', '`', 'code')} onMouseDown={preserveSelection} title="Inline code" type="button"><Code aria-hidden="true" size={15} /></button>
        <button aria-label="Code block" className={toolbarButtonClassName} onClick={() => apply('```\n', '\n```', 'code')} onMouseDown={preserveSelection} title="Code block" type="button"><Code aria-hidden="true" size={15} /></button>
        <button aria-label="Link" className={toolbarButtonClassName} onClick={() => apply('[', '](https://)', 'link text')} onMouseDown={preserveSelection} title="Link" type="button"><Link aria-hidden="true" size={15} /></button>
        <button aria-label="Quote" className={toolbarButtonClassName} onClick={() => applyLinePrefix('> ', 'quote')} onMouseDown={preserveSelection} title="Quote" type="button"><Quote aria-hidden="true" size={15} /></button>
      </div>}
    </div>
    {mode === 'preview' ? <div aria-labelledby={previewTabId} aria-label={`${label} preview`} className="min-h-20 p-3 text-sm text-slate-800" id={previewPanelId} role="tabpanel"><MarkdownContent value={value} />{!value && <span className="text-slate-400">Nothing to preview yet. Write some Markdown to see the result.</span>}</div> : <div aria-labelledby={writeTabId} id={writePanelId} role="tabpanel"><textarea aria-label={label} className="block min-h-20 w-full resize-y rounded-b-lg border-0 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none" id={id} maxLength={maxLength} name={id} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} ref={textareaRef} required={required} rows={rows} value={value} /></div>}
    <p className="px-3 pb-2 text-xs text-slate-400">Markdown supported</p>
  </div>;
};
