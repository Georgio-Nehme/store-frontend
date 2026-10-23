import { isRichTextHtml } from '@/lib/richText';

interface Props {
  value: string | null | undefined;
  className?: string;
}

/** Renders a product description: sanitized HTML from the editor, or legacy plain text. */
export default function RichText({ value, className = '' }: Props) {
  if (!value) return null;
  if (isRichTextHtml(value)) {
    // Sanitized server-side (ProductResponse validator) before it reaches the browser.
    return <div className={`rich-text break-words ${className}`} dangerouslySetInnerHTML={{ __html: value }} />;
  }
  return <p className={`whitespace-pre-line break-words ${className}`}>{value}</p>;
}
