// Product descriptions are either legacy plain text or sanitized HTML from the rich-text
// editor (the backend allowlists tags/colours — see ecom-platform/app/utils/rich_text.py).

const TAG_RE = /<\s*\/?\s*[a-zA-Z!]/;

export function isRichTextHtml(value: string | null | undefined): boolean {
  return !!value && TAG_RE.test(value);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Turn a legacy plain-text description into editor HTML, keeping its line breaks. */
export function toEditorHtml(value: string | null | undefined): string {
  if (!value) return '';
  if (isRichTextHtml(value)) return value;
  // One paragraph per line (empty lines become empty paragraphs), matching how the
  // editor treats Enter, so blank lines survive the round trip.
  return value
    .split('\n')
    .map(line => `<p>${escapeHtml(line)}</p>`)
    .join('');
}
