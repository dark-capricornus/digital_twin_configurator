import { Check } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/* ---------------------------------------------------------------- splitter */

/**
 * 4px drag handle between docked panels. Reports the new size while dragging;
 * `invert` is for panels that grow when the pointer moves left/up.
 */
export function Splitter({
  direction,
  size,
  onResize,
  min,
  max,
  invert = false,
}: {
  direction: 'horizontal' | 'vertical';
  size: number;
  onResize: (px: number) => void;
  min: number;
  max: number;
  invert?: boolean;
}) {
  const start = useRef<{ pos: number; size: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const axis = direction === 'horizontal' ? 'clientX' : 'clientY';

  return (
    <div
      className={`splitter ${direction} ${dragging ? 'dragging' : ''}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { pos: e[axis], size };
        setDragging(true);
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        const delta = (e[axis] - start.current.pos) * (invert ? -1 : 1);
        onResize(Math.min(max, Math.max(min, start.current.size + delta)));
      }}
      onPointerUp={() => {
        start.current = null;
        setDragging(false);
      }}
    />
  );
}

/* ------------------------------------------------------------ panel header */

export function PanelHeader({ icon, title, sub, actions }: { icon: ReactNode; title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="panel-head">
      <span className="panel-chip">{icon}</span>
      <span className="panel-title">{title}</span>
      {sub && <span className="panel-sub">{sub}</span>}
      <span className="spacer" />
      {actions}
    </header>
  );
}

/* ------------------------------------------------------------------ menus */

export type MenuItem =
  | { separator: true }
  | { label: string; onClick?: () => void; shortcut?: string; disabled?: boolean; checked?: boolean; danger?: boolean; hint?: string };

export function DropdownMenu({
  trigger,
  items,
  align = 'start',
  open,
  onOpenChange,
  triggerClass = 'menu-trigger',
}: {
  trigger: ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerClass?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onOpenChange(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div className="dropdown" ref={ref}>
      <button className={`${triggerClass} ${open ? 'open' : ''}`} onClick={() => onOpenChange(!open)}>
        {trigger}
      </button>
      {open && (
        <div className={`dropdown-pop ${align}`} role="menu">
          {items.map((item, i) =>
            'separator' in item ? (
              <div key={i} className="dropdown-sep" />
            ) : (
              <button
                key={i}
                role="menuitem"
                className={`dropdown-item ${item.danger ? 'danger' : ''}`}
                disabled={item.disabled}
                title={item.hint}
                onClick={() => {
                  onOpenChange(false);
                  item.onClick?.();
                }}
              >
                <span className="dropdown-check">{item.checked && <Check size={12} />}</span>
                <span className="dropdown-label">{item.label}</span>
                {item.shortcut && <span className="dropdown-shortcut">{item.shortcut}</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/** Desktop-style menubar: once a menu is open, hovering another title switches to it. */
export function MenuBarMenus({ menus }: { menus: { title: string; items: MenuItem[] }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <nav className="menubar-menus">
      {menus.map((m, i) => (
        <div key={m.title} onMouseEnter={() => openIdx !== null && setOpenIdx(i)}>
          <DropdownMenu
            trigger={m.title}
            items={m.items}
            open={openIdx === i}
            onOpenChange={(o) => setOpenIdx(o ? i : null)}
          />
        </div>
      ))}
    </nav>
  );
}
