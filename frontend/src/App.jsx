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
  // Cart stored locally
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem("papiki_cart");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // If cart has items, checkout cart instead of single item
      if (cart && cart.length > 0) {
        const payload = {
          name: name.trim() || "Guest",
          items: cart.map((it) => ({
            productId: it.productId,
            qty: it.qty,
            price: it.price,
          })),
        };
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        let json = {};
        try {
          json = text ? JSON.parse(text) : {};
        } catch {}
        if (res.ok && json.success) {
          alert("Pesanan terkirim (id: " + json.id + ")");
          setCart([]);
          localStorage.removeItem("papiki_cart");
          setName("");
          setCoffeeType("robusta");
          setQuantity(1);
        } else {
          alert("Error: " + (json.error || text || res.statusText));
        }
      } else {
        // Single item order
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
      }
    } catch (err) {
      alert("Gagal kirim: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add product by slug to cart (for menu grid)
  function addProductToCart(slug, qty = 1) {
    const prod = products.find((p) => p.slug === slug) || null;
    if (!prod) return;
    const item = {
      productId: prod._id,
      name: prod.name,
      qty: qty,
      price: Number(prod.price),
    };
    setCart((c) => {
      const existing = c.find((x) => x.productId === item.productId);
      let next;
      if (existing) {
        next = c.map((x) =>
          x.productId === item.productId ? { ...x, qty: x.qty + qty } : x
        );
      } else {
        next = [...c, item];
      }
      try {
        localStorage.setItem("papiki_cart", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  useEffect(() => {
    try {
      localStorage.setItem("papiki_cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  function removeFromCart(index) {
    setCart((c) => {
      const next = c.slice();
      next.splice(index, 1);
      try {
        localStorage.setItem("papiki_cart", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function updateCartQty(index, qty) {
    setCart((c) => {
      const next = c.slice();
      next[index] = { ...next[index], qty: Number(qty) || 1 };
      try {
        localStorage.setItem("papiki_cart", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  async function placeOrderFromCart() {
    if (!cart || !cart.length) return alert("Keranjang kosong");
    setLoading(true);
    try {
      const payload = {
        name: name.trim() || "Guest",
        items: cart.map((it) => ({
          productId: it.productId,
          qty: it.qty,
          price: it.price,
        })),
      };
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {}
      if (res.ok && json.success) {
        alert("Pesanan terkirim (id: " + json.id + ")");
        setCart([]);
        localStorage.removeItem("papiki_cart");
        setCartOpen(false);
      } else {
        alert("Error: " + (json.error || text || res.statusText));
      }
    } catch (err) {
      alert("Gagal kirim: " + err.message);
    } finally {
      setLoading(false);
    }
  }

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

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button type="submit" disabled={loading}>
                {loading ? "Mengirim..." : "Pesan Sekarang"}
              </button>

              <button
                type="button"
                onClick={() => {
                  const prod = products.find((p) => p.slug === coffeeType);
                  if (prod) {
                    addProductToCart(coffeeType, Number(quantity) || 1);
                    alert("Ditambahkan ke keranjang!");
                  } else {
                    alert("Produk tidak ditemukan");
                  }
                }}
                disabled={loading}
                style={{ backgroundColor: "#F3FFEE", color: "#264940" }}
              >
                Tambah
              </button>

              <button
                type="button"
                onClick={() => setCartOpen(true)}
                disabled={loading}
                style={{ position: "relative" }}
              >
                Lihat Pesanan
                {cart && cart.length ? (
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      background: "#e53e3e",
                      color: "#fff",
                      borderRadius: 999,
                      padding: "2px 6px",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {cart.length}
                  </span>
                ) : null}
              </button>
            </div>
          </form>
        </main>
        {/* Cart modal */}
        {cartOpen && (
          <div className="cart-modal" role="dialog" aria-modal="true">
            <div className="cart-modal__inner">
              <h3>Keranjang Anda</h3>
              {cart && cart.length ? (
                <div>
                  <ul>
                    {cart.map((it, i) => (
                      <li key={i}>
                        <div style={{ flex: 1, fontWeight: 600 }}>
                          {it.name}
                        </div>
                        <div>
                          <input
                            type="number"
                            min="1"
                            value={it.qty}
                            onChange={(e) => updateCartQty(i, e.target.value)}
                          />
                        </div>
                        <div style={{ minWidth: 100, textAlign: "right" }}>
                          Rp {(it.price * it.qty).toLocaleString()}
                        </div>
                        <div>
                          <button
                            onClick={() => removeFromCart(i)}
                            style={{
                              backgroundColor: "#e53e3e",
                              color: "white",
                            }}
                          >
                            Hapus
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="cart-modal__total">
                    Total: Rp{" "}
                    {cart
                      .reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0)
                      .toLocaleString()}
                  </div>
                  <div className="cart-modal__actions">
                    <button
                      onClick={() => placeOrderFromCart()}
                      disabled={loading}
                      style={{ backgroundColor: "#2f6b5b", color: "white" }}
                    >
                      Pesan Sekarang
                    </button>
                    <button
                      onClick={() => setCartOpen(false)}
                      style={{ backgroundColor: "#6b7280", color: "white" }}
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p
                    style={{
                      margin: "20px 0",
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    Keranjang kosong.
                  </p>
                  <div className="cart-modal__actions">
                    <button
                      onClick={() => setCartOpen(false)}
                      style={{ backgroundColor: "#6b7280", color: "white" }}
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <MenuGrid
          loading={loading}
          onConsult={() => {
            window.open("https://wa.me/6281218007819", "_blank");
          }}
        />
        <Footer />
        {/* list-menu moved into MenuGrid component to avoid duplication */}
      </div>
    </>
  );
}
