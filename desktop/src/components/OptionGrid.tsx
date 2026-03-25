import { useEffect, useRef, type RefObject } from 'react';
import './OptionGrid.css';

export interface OptionGridOption {
  value: string;
  label: string;
  /** Flag emoji (e.g. country selector); shown as main visual when present */
  flag?: string;
  /** Acronym/code (e.g. "EN", "ES"); shown as big visual above label when present; used when no flag */
  acronym?: string;
}

interface OptionGridProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: OptionGridOption[];
  label?: string;
  'aria-label'?: string;
  className?: string;
  /** When set, only clear selection when the click is outside this element (e.g. modal dialog). Stops clearing when clicking other form fields in the same modal. */
  clickOutsideBoundaryRef?: RefObject<HTMLElement | null>;
}

/**
 * Grid selector for modals. Each cell: flag (or acronym) as main visual + label.
 * Tap a cell to select; tap outside to clear. Country: use flag. Language: use acronym.
 */
export default function OptionGrid(props: OptionGridProps) {
  const { value, onChange, options, label, 'aria-label': ariaLabel, className = '', clickOutsideBoundaryRef } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value === undefined) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target)) {
        if (clickOutsideBoundaryRef?.current?.contains(target)) return;
        onChange(undefined);
      }
    };
    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
    };
  }, [value, onChange, clickOutsideBoundaryRef]);

  return (
    <div
      ref={containerRef}
      className={`option-grid ${className}`.trim()}
      role="group"
      aria-label={ariaLabel ?? label}
    >
      {label && <span className="option-grid-label">{label}</span>}
      <div className="option-grid-scroll">
        <div className="option-grid-row">
          {options.map((opt) => (
            <OptionCell
              key={opt.value}
              option={opt}
              selected={value === opt.value}
              onClick={() => onChange(opt.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function OptionCell({
  option,
  selected,
  onClick,
}: {
  option: OptionGridOption;
  selected: boolean;
  onClick: () => void;
}) {
  const visual = option.flag != null
    ? <span className="option-grid-cell-flag" aria-hidden>{option.flag}</span>
    : option.acronym != null
      ? <span className="option-grid-cell-acronym" aria-hidden>{option.acronym}</span>
      : null;
  return (
    <button
      type="button"
      className={`option-grid-cell ${selected ? 'option-grid-cell-selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={option.label}
    >
      {visual}
      <span className="option-grid-cell-label">{option.label}</span>
    </button>
  );
}
