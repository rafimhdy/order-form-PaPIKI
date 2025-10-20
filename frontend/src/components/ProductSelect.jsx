import React, { useEffect, useRef, useState } from "react";

export default function ProductSelect({
  products = [],
  value,
  onChange,
  placeholder = "Pilih produk",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, []);

  const selected =
    products.find((p) => p.slug === value) ||
    products.find(
      (p) => (p.name || "").toLowerCase().replace(/\s+/g, "") === value
    );

  return (
    <div ref={ref} className={`product-select ${open ? "open" : ""}`}>
      <button
        type="button"
        className="product-select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
      >
        {selected ? (
          <span className="product-select__item">
            {selected.image ? (
              <img src={selected.image} alt={selected.name} />
            ) : null}
            <span>{selected.name}</span>
          </span>
        ) : (
          <span className="product-select__placeholder">{placeholder}</span>
        )}
        <span className="product-select__chev">▾</span>
      </button>

      {open && (
        <ul className="product-select__list" role="listbox">
          {products.map((p) => (
            <li
              key={p._id || p.slug}
              className="product-select__option"
              onClick={() => {
                onChange && onChange(p.slug);
                setOpen(false);
              }}
            >
              {p.image ? <img src={p.image} alt="" /> : null}
              <div className="product-select__meta">
                <div className="product-select__name">{p.name}</div>
                <div className="product-select__price">
                  Rp {Number(p.price).toLocaleString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
