import React, { useEffect, useState } from "react";
import "./AdminDashboard.css";
import StatusSelect from "./StatusSelect";

export default function AdminDashboard() {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(null);
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);

  const [token, setToken] = useState(
    localStorage.getItem("adminToken") || null
  );
  const [authUser, setAuthUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Search states
  const [ordersSearch, setOrdersSearch] = useState("");
  const [productsSearch, setProductsSearch] = useState("");

  // Filtered data
  const filteredOrders = React.useMemo(() => {
    if (!ordersSearch.trim()) return orders;
    const query = ordersSearch.toLowerCase();
    return orders.filter((order) => {
      const customerName = (order.customerName || "").toLowerCase();
      const userName = (order.user?.name || "").toLowerCase();
      const itemsText =
        order.items
          ?.map((it) => it.name)
          .join(" ")
          .toLowerCase() || "";
      const status = (order.status || "").toLowerCase();

      return (
        customerName.includes(query) ||
        userName.includes(query) ||
        itemsText.includes(query) ||
        status.includes(query)
      );
    });
  }, [orders, ordersSearch]);

  const filteredProducts = React.useMemo(() => {
    if (!productsSearch.trim()) return products;
    const query = productsSearch.toLowerCase();
    return products.filter((product) => {
      const name = (product.name || "").toLowerCase();
      const slug = (product.slug || "").toLowerCase();
      const description = (product.description || "").toLowerCase();

      return (
        name.includes(query) ||
        slug.includes(query) ||
        description.includes(query)
      );
    });
  }, [products, productsSearch]);

  // NOTE: the effect that reacts to `tab` must be declared after the
  // loadUsers/loadOrders/loadProducts functions to avoid referencing
  // those variables before they are initialized (TDZ / runtime error).

  // validate token and load auth user
  useEffect(() => {
    async function validate() {
      if (!token) return setAuthUser(null);
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: "Bearer " + token },
        });
        if (!res.ok) throw new Error("Token invalid");
        const json = await res.json();
        setAuthUser(json);
      } catch (err) {
        console.warn("Token validation failed", err);
        localStorage.removeItem("adminToken");
        setToken(null);
        setAuthUser(null);
      }
    }
    validate();
  }, [token]);

  const authHeaders = React.useCallback(
    (isJSON = true) => {
      const h = {};
      if (isJSON) h["Content-Type"] = "application/json";
      if (token) h["Authorization"] = "Bearer " + token;
      return h;
    },
    [token]
  );

  async function loginAdmin() {
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }
      if (!res.ok)
        throw new Error(json.error || text || res.statusText || "Login failed");
      localStorage.setItem("adminToken", json.token);
      setToken(json.token);
      setAuthUser(json.user);
      setLoginEmail("");
      setLoginPassword("");
      setTab("orders");
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  function logout() {
    localStorage.removeItem("adminToken");
    setToken(null);
    setAuthUser(null);
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    loginAdmin();
  }

  const loadOrders = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!authUser) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/orders", { headers: authHeaders(false) });
      const text = await res.text();
      if (!res.ok)
        throw new Error(text || res.statusText || "Failed to load orders");
      let json = [];
      try {
        json = text ? JSON.parse(text) : [];
      } catch {
        json = [];
      }
      setOrders(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, authUser]);

  async function updateOrderStatus(id, status) {
    setError(null);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadOrders();
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function removeOrder(id) {
    if (!confirm("Hapus order ini?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
        headers: authHeaders(false),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadOrders();
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  // Products CRUD
  const loadProducts = React.useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/products");
      const text = await res.text();
      if (!res.ok)
        throw new Error(text || res.statusText || "Failed to load products");
      let json = [];
      try {
        json = text ? JSON.parse(text) : [];
      } catch {
        json = [];
      }
      setProducts(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err.message || String(err));
    }
  }, []);

  // run loader when tab changes (loaders declared above)
  useEffect(() => {
    if (tab === "orders") loadOrders();
    else if (tab === "products") loadProducts();
  }, [tab, loadOrders, loadProducts]);

  async function createProduct(payload) {
    setError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadProducts();
      setEditingProduct(null);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function updateProduct(id, payload) {
    setError(null);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadProducts();
      setEditingProduct(null);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function deleteProduct(id) {
    if (!confirm("Hapus produk ini?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: authHeaders(false),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadProducts();
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  return (
    <div className="admin">
      <header className="admin__header">
        <h2>Admin Dashboard</h2>
        {authUser ? (
          <>
            <div className="admin__tabs">
              <button
                className={tab === "orders" ? "active" : ""}
                onClick={() => setTab("orders")}
              >
                Orders
              </button>
              <button
                className={tab === "products" ? "active" : ""}
                onClick={() => setTab("products")}
              >
                Products
              </button>
            </div>
            {/* mobile-friendly tab selector */}
            <select
              className="admin__tab-select"
              value={tab}
              onChange={(e) => setTab(e.target.value)}
              aria-label="Pilih tab admin"
            >
              <option value="orders">Orders</option>
              <option value="products">Products</option>
            </select>
            <div className="admin__user">
              {authUser ? (
                <>
                  <span style={{ marginRight: 8 }}>Hi, {authUser.name}</span>
                  <button onClick={logout}>Logout</button>
                </>
              ) : null}
            </div>
          </>
        ) : (
          <div className="admin__login-prompt">
            Silakan login untuk mengelola orders, users, dan products.
          </div>
        )}
      </header>

      <main className="admin__main">
        {error && <div className="admin__error">{String(error)}</div>}

        {!authUser && (
          <section className="admin__login">
            <h3 className="admin__login-title">Admin Login</h3>
            <form className="admin__login-form" onSubmit={handleLoginSubmit}>
              <label className="admin__label">Email</label>
              <input
                className="admin__input"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                aria-label="Email"
              />

              <label className="admin__label">Password</label>
              <input
                className="admin__input"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                aria-label="Password"
              />

              <div className="admin__login-actions">
                <button
                  type="submit"
                  className="admin__login-btn"
                  disabled={!loginEmail || !loginPassword}
                >
                  Login
                </button>
              </div>
            </form>
          </section>
        )}

        {token && tab === "orders" && (
          <section>
            <div className="admin__toolbar">
              <div className="admin__search">
                <input
                  type="text"
                  placeholder="Cari orders (nama customer, produk, status)..."
                  value={ordersSearch}
                  onChange={(e) => setOrdersSearch(e.target.value)}
                  className="admin__search-input"
                />
              </div>
              <div className="admin__toolbar-actions">
                <button onClick={loadOrders}>Refresh</button>
              </div>
            </div>

            <div className="admin__table-wrap">
              <table className="admin__table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Dibuat</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o, idx) => (
                    <tr key={o._id}>
                      <td data-label="#">{idx + 1}</td>
                      <td data-label="Customer">
                        {o.customerName && o.customerName.trim()
                          ? o.customerName
                          : o.user
                          ? o.user.name
                          : "—"}
                      </td>
                      <td data-label="Items">
                        {o.items && o.items.length ? (
                          <ul className="admin__items">
                            {o.items.map((it, i) => (
                              <li key={i}>
                                {it.name} ×{it.qty}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="Total">
                        Rp {Number(o.total).toLocaleString()}
                      </td>
                      <td data-label="Status">
                        <StatusSelect
                          value={o.status}
                          onChange={(s) => updateOrderStatus(o._id, s)}
                        />
                      </td>
                      <td data-label="Dibuat">
                        {new Date(o.createdAt).toLocaleString()}
                      </td>
                      <td data-label="Aksi">
                        <button
                          onClick={() => setShowOrderDetails(o)}
                          aria-label={`Lihat order ${o._id}`}
                        >
                          Lihat
                        </button>
                        <button
                          onClick={() => removeOrder(o._id)}
                          aria-label={`Hapus order ${o._id}`}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {showOrderDetails && (
          <div className="admin__modal" role="dialog" aria-modal="true">
            <div className="admin__modal-inner">
              <h3>Order {showOrderDetails._id}</h3>
              <p>
                Customer:{" "}
                {showOrderDetails.customerName &&
                showOrderDetails.customerName.trim()
                  ? showOrderDetails.customerName
                  : showOrderDetails.user
                  ? showOrderDetails.user.name
                  : "—"}
              </p>
              <ul>
                {showOrderDetails.items.map((it, i) => (
                  <li key={i}>
                    {it.name} — {it.qty} × Rp{" "}
                    {Number(it.price).toLocaleString()}
                  </li>
                ))}
              </ul>
              <p>Total: Rp {Number(showOrderDetails.total).toLocaleString()}</p>
              <div className="admin__modal-actions">
                <button
                  onClick={() => {
                    setShowOrderDetails(null);
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {token && tab === "products" && (
          <section>
            <div className="admin__toolbar">
              <div className="admin__search">
                <input
                  type="text"
                  placeholder="Cari produk (nama, slug, deskripsi)..."
                  value={productsSearch}
                  onChange={(e) => setProductsSearch(e.target.value)}
                  className="admin__search-input"
                />
              </div>
              <div className="admin__toolbar-actions">
                <button
                  onClick={() =>
                    setEditingProduct({
                      name: "",
                      slug: "",
                      price: 10000,
                      image: "",
                      stock: 100,
                    })
                  }
                >
                  Tambah Product
                </button>
                <button onClick={loadProducts}>Refresh</button>
              </div>
            </div>

            {editingProduct && (
              <div className="admin__form">
                <label>Nama</label>
                <input
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      name: e.target.value,
                    })
                  }
                />
                <label>Slug</label>
                <input
                  value={editingProduct.slug}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      slug: e.target.value,
                    })
                  }
                />
                <label>Harga</label>
                <input
                  type="number"
                  value={editingProduct.price}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      price: Number(e.target.value),
                    })
                  }
                />
                <label>Image (path)</label>
                <input
                  value={editingProduct.image}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      image: e.target.value,
                    })
                  }
                />
                <label>Stock</label>
                <input
                  type="number"
                  value={editingProduct.stock}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      stock: Number(e.target.value),
                    })
                  }
                />
                <div className="admin__form-actions">
                  <button
                    onClick={() =>
                      editingProduct._id
                        ? updateProduct(editingProduct._id, editingProduct)
                        : createProduct(editingProduct)
                    }
                  >
                    Simpan
                  </button>
                  <button onClick={() => setEditingProduct(null)}>Batal</button>
                </div>
              </div>
            )}

            <div className="admin__table-wrap">
              <table className="admin__table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Nama</th>
                    <th>Slug</th>
                    <th>Harga</th>
                    <th>Stock</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p._id}>
                      <td data-label="Image" style={{ width: 120 }}>
                        <img
                          src={p.image}
                          alt={p.name}
                          style={{ maxWidth: 100 }}
                        />
                      </td>
                      <td data-label="Nama">{p.name}</td>
                      <td data-label="Slug">{p.slug}</td>
                      <td data-label="Harga">
                        Rp {Number(p.price).toLocaleString()}
                      </td>
                      <td data-label="Stock">{p.stock}</td>
                      <td data-label="Aksi">
                        <button
                          onClick={() => setEditingProduct(p)}
                          aria-label={`Edit ${p.name}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(p._id)}
                          aria-label={`Hapus ${p.name}`}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
