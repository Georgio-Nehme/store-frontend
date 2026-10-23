'use client';

import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { toEditorHtml } from '@/lib/richText';

const COLORS = ['#111827', '#dc2626', '#ea580c', '#16a34a', '#2563eb', '#7c3aed', '#db2777'];

interface Props {
  value: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ value, onChange }: Props) {
  // Last HTML we emitted, so external value changes (e.g. product loaded) can be told apart
  const lastEmitted = useRef<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Only what the backend sanitizer allows
      StarterKit.configure({ heading: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false }),
      Underline,
      TextStyle,
      Color,
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: { class: 'rich-text min-h-[6rem] px-3 py-2 focus:outline-none' },
    },
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? '' : editor.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    editor.commands.setContent(toEditorHtml(value), false);
    lastEmitted.current = value;
  }, [editor, value]);

  const btn = (active: boolean) =>
    `px-2 py-1 rounded text-sm ${active ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'}`;
  const currentColor = (editor?.getAttributes('textStyle').color as string | undefined) ?? '';

  return (
    <div className="w-full border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500">
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1">
        <button type="button" title="Bold" onClick={() => editor?.chain().focus().toggleBold().run()} className={`${btn(!!editor?.isActive('bold'))} font-bold`}>B</button>
        <button type="button" title="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()} className={`${btn(!!editor?.isActive('italic'))} italic`}>I</button>
        <button type="button" title="Underline" onClick={() => editor?.chain().focus().toggleUnderline().run()} className={`${btn(!!editor?.isActive('underline'))} underline`}>U</button>
        <button type="button" title="Bullet list" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={btn(!!editor?.isActive('bulletList'))}>• List</button>
        <button type="button" title="Numbered list" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={btn(!!editor?.isActive('orderedList'))}>1. List</button>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        {COLORS.map(color => (
          <button
            key={color}
            type="button"
            title={`Text colour ${color}`}
            onClick={() => editor?.chain().focus().setColor(color).run()}
            className={`w-5 h-5 rounded-full border ${currentColor === color ? 'ring-2 ring-offset-1 ring-blue-500' : 'border-gray-300'}`}
            style={{ backgroundColor: color }}
          />
        ))}
        <input
          type="color"
          title="Custom colour"
          value={/^#[0-9a-f]{6}$/i.test(currentColor) ? currentColor : '#000000'}
          onChange={e => editor?.chain().focus().setColor(e.target.value).run()}
          className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer"
        />
        <button type="button" title="Remove colour" onClick={() => editor?.chain().focus().unsetColor().run()} className={btn(false)}>
          Clear colour
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
