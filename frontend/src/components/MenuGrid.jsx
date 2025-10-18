import React from "react";
import "./MenuGrid.css";

export default function MenuGrid({
  loading = false,
  onConsult = () => alert("Terima kasih — kami akan menghubungi Anda"),
}) {
  const items = [
    { id: 1, img: "/assets/robusta.png", alt: "Kopi Robusta", area: "a" },
    {
      id: 2,
      img: "/assets/arabikanatural.png",
      alt: "Kopi Arabika Natural",
      area: "b",
    },
    {
      id: 3,
      img: "/assets/arabikaeksperimental.png",
      alt: "Kopi Arabika Eksperimental",
      area: "c",
    },
    {
      id: 4,
      img: "/assets/arabikahoney.png",
      alt: "Kopi Arabika Honey",
      area: "d",
    },
    {
      id: 5,
      img: "/assets/arabikafullwash.png",
      alt: "Kopi Arabika Full Wash",
      area: "e",
    },
  ];

  return (
    <section className="menu-grid-wrapper">
      <header className="menu-grid__header">
        <h2>Menu Pilihan Kami!</h2>
        <p>Nikmati berbagai pilihan kopi terbaik kami.</p>
      </header>

      <section className="menu-grid" aria-label="Menu list">
        {items.map((it, idx) => (
          <article
            key={it.id}
            className={`menu-card menu-card--${idx + 1}`}
            role="img"
            aria-label={it.alt}
          >
            <img className="menu-card__img" src={it.img} alt={it.alt} />
          </article>
        ))}
      </section>

      <div className="menu-grid__cta-wrap">
        <button
          className="menu-grid__cta"
          type="button"
          disabled={loading}
          onClick={onConsult}
        >
          {loading ? "Mengirim..." : "Konsultasi Sekarang"}
        </button>
      </div>
    </section>
  );
}
