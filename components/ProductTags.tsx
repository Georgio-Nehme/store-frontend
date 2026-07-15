import { ProductTag } from '@/lib/types';
import { TAG_DEFINITIONS } from '@/lib/tags';

export default function ProductTags({ tags }: { tags: ProductTag[] }) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => {
        const def = TAG_DEFINITIONS[tag];
        if (!def) return null;
        return (
          <span
            key={tag}
            className={`inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-medium ${def.className}`}
          >
            {def.label}
          </span>
        );
      })}
    </div>
  );
}
