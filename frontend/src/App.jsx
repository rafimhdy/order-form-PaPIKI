import { useState } from "react";
import "./App.css";
import NavBar from "./components/NavBar";
import MenuGrid from "./components/MenuGrid";
import Footer from "./components/Footer";

export default function App() {
  const [name, setName] = useState("");
  const [coffeeType, setCoffeeType] = useState("espresso");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          coffee_type: coffeeType,
          quantity: Number(quantity) || 1,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert("Pesanan terkirim (id: " + json.id + ")");
        setName("");
        setCoffeeType("espresso");
        setQuantity(1);
      } else {
        alert("Error: " + (json.error || JSON.stringify(json)));
      }
    } catch (err) {
      alert("Gagal kirim: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <div className="page">
        <div className="banner">
          <div className="banner__inner">
            <img src="/assets/banner.jpg" alt="Banner Kopi" />
            <div className="banner__overlay">Get Yours Now!</div>
          </div>
        </div>

        <main className="order-form">
          <h1>Form Pemesanan Kopi</h1>
          <form onSubmit={handleSubmit}>
            <label>Nama:</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <label>Jenis Kopi:</label>
            <select
              value={coffeeType}
              onChange={(e) => setCoffeeType(e.target.value)}
            >
              <option value="robusta">Robusta</option>
              <option value="arabikanatural">Arabika Natural</option>
              <option value="arabikaeksperimental">
                Arabika Eksperimental
              </option>
              <option value="arabikahoney">Arabika Honey</option>
              <option value="arabikafullwash">Arabika Full Wash</option>
            </select>

            <label>Jumlah:</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Mengirim..." : "Pesan Sekarang"}
            </button>
          </form>
        </main>
        <MenuGrid
          loading={loading}
          onConsult={() => alert("Terima kasih — kami akan menghubungi Anda")}
        />
        <Footer />
        {/* list-menu moved into MenuGrid component to avoid duplication */}
      </div>
    </>
  );
}
