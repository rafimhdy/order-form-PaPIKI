import React, { useEffect, useState } from "react";
import "./AdminDashboard.css";
import StatusSelect from "./StatusSelect";

export default function AdminDashboard() {
  const [tab, setTab] = useState("orders");
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(null);
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);

  const [token, setToken] = useState(
    localStorage.getItem("adminToken") || null
  );
  const [authUser, setAuthUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

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

  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!authUser) {
      // don't try to call admin endpoints when not authenticated
      setUsers([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/users", { headers: authHeaders(false) });
      const text = await res.text();
      if (!res.ok)
        throw new Error(text || res.statusText || "Failed to load users");
      let json = [];
      try {
        json = text ? JSON.parse(text) : [];
      } catch {
        json = [];
      }
      setUsers(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, authUser]);

  function handleLoginSubmit(e) {
    e.preventDefault();
    loginAdmin();
  }

  async function createUser(payload) {
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadUsers();
      setEditingUser(null);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function updateUser(id, payload) {
    setError(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadUsers();
      setEditingUser(null);
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function removeUser(id) {
    if (!confirm("Hapus user ini?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: authHeaders(false),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadUsers();
    } catch (err) {
      setError(err.message || String(err));
    }
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
    if (tab === "users") loadUsers();
    else if (tab === "orders") loadOrders();
    else if (tab === "products") loadProducts();
  }, [tab, loadUsers, loadOrders, loadProducts]);

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
                className={tab === "users" ? "active" : ""}
                onClick={() => setTab("users")}
              >
                Users
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
              <option value="users">Users</option>
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

        {token && tab === "users" && (
          <section>
            <div className="admin__toolbar">
              <button onClick={() => setEditingUser({ name: "", email: "" })}>
                Tambah User
              </button>
              <button onClick={loadUsers}>Refresh</button>
            </div>

            {editingUser && (
              <div className="admin__form">
                <label>Nama</label>
                <input
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                />
                <label>Email</label>
                <input
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                />
                <div className="admin__form-actions">
                  <button
                    onClick={() =>
                      editingUser._id
                        ? updateUser(editingUser._id, editingUser)
                        : createUser(editingUser)
                    }
                  >
                    Simpan
                  </button>
                  <button onClick={() => setEditingUser(null)}>Batal</button>
                </div>
              </div>
            )}

            <div className="admin__table-wrap">
              <table className="admin__table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>Dibuat</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td data-label="Nama">{u.name}</td>
                      <td data-label="Email">{u.email}</td>
                      <td data-label="Dibuat">
                        {new Date(u.createdAt).toLocaleString()}
                      </td>
                      <td data-label="Aksi">
                        <button
                          onClick={() => setEditingUser(u)}
                          aria-label={`Edit ${u.name}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeUser(u._id)}
                          aria-label={`Hapus ${u.name}`}
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

        {token && tab === "orders" && (
          <section>
            <div className="admin__toolbar">
              <button onClick={loadOrders}>Refresh</button>
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
                  {orders.map((o, idx) => (
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
              <button
                onClick={() =>
                  setEditingProduct({
                    name: "",
                    slug: "",
                    price: 10000,
                    image: "",
                    available: true,
                  })
                }
              >
                Tambah Product
              </button>
              <button onClick={loadProducts}>Refresh</button>
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
                <label>Avaliable</label>
                <select
                  value={editingProduct.available ? "1" : "0"}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      available: e.target.value === "1",
                    })
                  }
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
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
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
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
