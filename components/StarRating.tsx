'use client';

interface Props {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (value: number) => void;
}

const SIZE_CLASSES: Record<NonNullable<Props['size']>, string> = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
};

export default function StarRating({ rating, size = 'sm', interactive = false, onChange }: Props) {
  const rounded = Math.round(rating);

  return (
    <div className={`inline-flex gap-0.5 ${SIZE_CLASSES[size]}`} role={interactive ? 'radiogroup' : undefined}>
      {[1, 2, 3, 4, 5].map(value => {
        const filled = value <= rounded;
        if (!interactive) {
          return (
            <span key={value} className={filled ? 'text-amber-400' : 'text-gray-300'}>
              ★
            </span>
          );
        }
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={value === rounded}
            aria-label={`${value} star${value > 1 ? 's' : ''}`}
            onClick={() => onChange?.(value)}
            className={`transition-colors ${filled ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
