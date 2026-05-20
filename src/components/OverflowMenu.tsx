import { useState, useRef, useEffect, type ReactNode } from 'react';
import './OverflowMenu.css';

export interface OverflowMenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onSelect: () => void;
}

interface OverflowMenuProps {
  readonly items: OverflowMenuItem[];
}

function OverflowMenu({ items }: OverflowMenuProps) {
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

  const anyActive = items.some(item => item.active);

  return (
    <div className="overflow-menu" ref={menuRef}>
      <button
        className={`input-tab overflow-menu-trigger${anyActive ? ' active' : ''}`}
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
          {items.map(item => (
            <button
              key={item.id}
              className={`overflow-menu-item${item.active ? ' active' : ''}`}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              <div className="overflow-menu-item-icon">
                {item.icon}
              </div>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default OverflowMenu;
