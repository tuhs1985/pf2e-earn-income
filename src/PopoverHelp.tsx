import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import "./PopoverHelp.css";

// Matches the crafting app's click-to-open information popover.
export default function PopoverHelp({ children, label = "Help with applying one result to all downtime days" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <span className="popover-help" ref={ref}>
      <button
        type="button"
        className="popover-help-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(value => !value)}
        onKeyDown={event => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        ℹ️
      </button>
      {open && <span id={id} className="popover-help-popover">{children}</span>}
    </span>
  );
}
