import { useState, useRef, useEffect } from 'react';
import './OverflowMenu.css';

interface OverflowMenuProps {
  readonly active: boolean;
  readonly onSelect: () => void;
  readonly label: string;
}

function OverflowMenu({ active, onSelect, label }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = () => {
    setOpen(false);
    onSelect();
  };

  return (
    <div className="overflow-menu" ref={menuRef}>
      <button
        className={`input-tab overflow-menu-trigger${active ? ' active' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-label="Plus d'options"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div className="overflow-menu-dropdown">
          <button
            className={`overflow-menu-item${active ? ' active' : ''}`}
            onClick={handleSelect}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
            </svg>
            {label}
          </button>
        </div>
      )}
    </div>
  );
}

export default OverflowMenu;
