/** Converts supported Markdown to text suitable for compact table cells. */
export const markdownToPlainText = (markdown?: string | null) => (markdown ?? '')
  .replace(/```[\s\S]*?```/g, (block) => block.slice(3, -3))
  .replace(/!?(\[([^\]]*)\]\([^)]*\))/g, '$2')
  .replace(/(\*\*|__|`|\*|_)/g, '')
  .replace(/^\s*(?:[-*+] |\d+\. )/gm, '')
  .replace(/\s+/g, ' ')
  .trim();
