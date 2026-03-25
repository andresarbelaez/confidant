import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  ariaRequired?: boolean;
  className?: string;
}

export default function Select({
  id,
  options,
  value,
  onChange,
  label,
  placeholder,
  ariaRequired,
  className = '',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder ?? '';

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(value ? options.findIndex((o) => o.value === value) : 0);
      return;
    }
    setActiveIndex(value ? options.findIndex((o) => o.value === value) : 0);
  }, [isOpen, value, options]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i < options.length - 1 ? i + 1 : i));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i > 0 ? i - 1 : 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIndex >= 0 && options[activeIndex]) {
          onChange(options[activeIndex].value);
          setIsOpen(false);
        }
        break;
      default:
        break;
    }
  };

  const listboxId = `${id}-listbox`;

  return (
    <div ref={containerRef} className={`confidant-select ${className}`}>
      {label && (
        <label htmlFor={id} className="confidant-select-label">
          {label}
        </label>
      )}
      <button
        type="button"
        id={id}
        className="confidant-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen && activeIndex >= 0 && options[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
        aria-required={ariaRequired}
        onClick={() => setIsOpen((o) => !o)}
        onKeyDown={handleKeyDown}
      >
        <span className="confidant-select-value">{displayLabel || '\u00A0'}</span>
        <ChevronDown size={18} className="confidant-select-icon" aria-hidden />
      </button>
      <ul
        id={listboxId}
        role="listbox"
        className="confidant-select-listbox"
        aria-labelledby={label ? undefined : id}
        hidden={!isOpen}
        tabIndex={-1}
      >
        {options.map((opt, i) => (
          <li
            key={opt.value || `opt-${i}`}
            id={`${id}-option-${i}`}
            role="option"
            aria-selected={opt.value === value}
            className={`confidant-select-option ${opt.value === value ? 'confidant-select-option-selected' : ''} ${i === activeIndex ? 'confidant-select-option-active' : ''}`}
            onClick={() => {
              onChange(opt.value);
              setIsOpen(false);
            }}
            onMouseEnter={() => setActiveIndex(i)}
          >
            {opt.label || opt.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
