"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

const MENU_GAP = 6;
const EDGE_MARGIN = 8;

export type MenuEntry = {
  label: string;
  danger?: boolean;
  run: () => void;
};

export function ActionMenu({
  entries,
  label,
  icon,
  triggerClassName = "ms-auto grid h-9 w-9 place-items-center rounded-xl transition",
  panelClassName = "w-40",
}: {
  entries: MenuEntry[];
  label: string;
  icon: React.ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
}) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const panelHeight = panel.offsetHeight;
    const panelWidth = panel.offsetWidth;
    const contentWidth = document.documentElement.clientWidth;
    const fixedOriginX =
      getComputedStyle(document.documentElement).direction === "rtl" ? window.innerWidth - contentWidth : 0;
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const top =
      spaceBelow >= panelHeight || spaceBelow >= rect.top - MENU_GAP
        ? rect.bottom + MENU_GAP
        : rect.top - panelHeight - MENU_GAP;
    const left = Math.min(
      Math.max(rect.left - fixedOriginX, EDGE_MARGIN),
      Math.max(EDGE_MARGIN, contentWidth - panelWidth - EDGE_MARGIN),
    );
    setPosition({ top, left });
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !position) return;
    itemRefs.current[0]?.focus();
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    const items = itemRefs.current.filter((el): el is HTMLButtonElement => el !== null);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (event.key === "ArrowDown") next = current < 0 ? 0 : (current + 1) % items.length;
    else if (event.key === "ArrowUp") next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    items[next]?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) setOpen(false);
        }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={`${triggerClassName} ${open ? "bg-line/60 text-ink" : ""}`}
      >
        {icon}
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          style={position ? { top: position.top, left: position.left } : { visibility: "hidden" }}
          className={`fixed z-40 rounded-xl bg-card p-1 shadow-lg ring-1 ring-line ${panelClassName}`}
        >
          {entries.map((entry, index) => (
            <button
              key={entry.label}
              type="button"
              role="menuitem"
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              onClick={() => {
                setOpen(false);
                entry.run();
              }}
              className={`block w-full rounded-lg px-3 py-2 text-start text-sm font-bold transition hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary ${
                entry.danger ? "text-danger" : "text-ink"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
