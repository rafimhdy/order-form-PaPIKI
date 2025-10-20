import { useState, useEffect } from "react";
import "./App.css";
import NavBar from "./components/NavBar";
import AdminDashboard from "./components/AdminDashboard";
import MenuGrid from "./components/MenuGrid";
import ProductSelect from "./components/ProductSelect";
import Footer from "./components/Footer";

export default function App() {
  const [name, setName] = useState("");
  const [coffeeType, setCoffeeType] = useState("robusta");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);

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

      // Some servers/dev setups may return an empty body or non-JSON on error.
      const text = await res.text();
      let json;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        console.error("Non-JSON response from /api/orders:", text);
        json = {};
      }

      if (res.ok && json.success) {
        alert("Pesanan terkirim (id: " + json.id + ")");
        setName("");
        setCoffeeType("robusta");
        setQuantity(1);
      } else {
        // Prefer structured validation details when provided by server
        if (
          json &&
          json.error === "ValidationError" &&
          Array.isArray(json.details)
        ) {
          const details = json.details
            .map((d) => `${d.path}: ${d.message}`)
            .join("\n");
          alert("Validation error:\n" + details);
        } else {
          alert("Error: " + (json.error || text || JSON.stringify(json)));
        }
      }
    } catch (err) {
      alert("Gagal kirim: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted) return;
        setProducts(Array.isArray(json) ? json : []);
      } catch (err) {
        // ignore — fallback price will be used
        console.warn(
          "Failed to load products for price lookup",
          err && err.message
        );
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function getPriceForType(type) {
    if (!type) return 10000;
    // try find by slug first, then by normalized name
    const slug = String(type).trim().toLowerCase();
    let p = products.find((x) => x.slug === slug);
    if (!p) {
      p = products.find(
        (x) => (x.name || "").toLowerCase().replace(/\s+/g, "") === slug
      );
    }
    return (p && Number(p.price)) || 10000;
  }

  const [isAdmin, setIsAdmin] = useState(() =>
    window.location.hash.startsWith("#admin")
  );

  useEffect(() => {
    const onHash = () => {
      const show =
        window.location.hash && window.location.hash.startsWith("#admin");
      console.debug(
        "[App] hashchange ->",
        window.location.hash,
        "showAdmin=",
        show
      );
      setIsAdmin(show);
    };
    window.addEventListener("hashchange", onHash);
    // also listen for popstate in case history API was used
    window.addEventListener("popstate", onHash);
    // run once in case the hash was set programmatically before listener attached
    onHash();
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
    };
  }, []);

  if (isAdmin) {
    return (
      <>
        <NavBar />
        <AdminDashboard />
      </>
    );
  }

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
            <ProductSelect
              products={products}
              value={coffeeType}
              onChange={setCoffeeType}
            />

            <label>Jumlah:</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />

            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: "#444" }}>
                Harga per item: Rp{" "}
                {getPriceForType(coffeeType).toLocaleString("id-ID")}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>
                Total: Rp{" "}
                {(
                  getPriceForType(coffeeType) * (Number(quantity) || 1)
                ).toLocaleString("id-ID")}
              </div>
            </div>

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
