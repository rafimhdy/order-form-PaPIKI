import React, { useEffect, useRef, useState } from "react";

const labels = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Shipped",
  cancelled: "Cancelled",
};

export default function StatusSelect({ value, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, []);

  const statuses = ["pending", "paid", "shipped", "cancelled"];

  return (
    <div
      ref={ref}
      className={`status-select ${className} ${open ? "open" : ""}`}
    >
      <button
        type="button"
        className="status-select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
      >
        <span className={`status-pill status-pill--${value}`}>
          {labels[value] || value}
        </span>
        <span className="status-select__chev" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <ul className="status-select__list" role="listbox">
          {statuses.map((s) => (
            <li
              key={s}
              role="option"
              aria-selected={s === value}
              className={`status-select__option ${
                s === value ? "selected" : ""
              }`}
              onClick={() => {
                onChange && onChange(s);
                setOpen(false);
              }}
            >
              {labels[s]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
