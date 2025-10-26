import React from "react";
import "./MenuGrid.css";

export default function MenuGrid({
  loading = false,
  onConsult = () => alert("Terima kasih — kami akan menghubungi Anda"),
}) {
  const items = [
    { id: 1, img: "/assets/robusta.png", alt: "Kopi Robusta" },
    {
      id: 2,
      img: "/assets/arabikanatural.png",
      alt: "Kopi Arabika Natural",
    },
    {
      id: 3,
      img: "/assets/arabikaeksperimental.png",
      alt: "Kopi Arabika Eksperimental",
    },
    {
      id: 4,
      img: "/assets/arabikahoney.png",
      alt: "Kopi Arabika Honey",
    },
    {
      id: 5,
      img: "/assets/arabikafullwash.png",
      alt: "Kopi Arabika Full Wash",
    },
  ];

  return (
    <section className="menu-grid-wrapper" id="produk">
      <header className="menu-grid__header">
        <h2>Menu Pilihan Kami!</h2>
        <p>
          Nikmati berbagai pilihan kopi terbaik kami
          <br />
          Kami mendapatkan biji kopi dari salah satu coffee shop terbaik di
          Bandung (1612 Coffee)
        </p>
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
