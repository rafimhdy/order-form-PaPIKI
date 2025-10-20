const mongoose = require("mongoose");
const Order = require("../models/order");
const User = require("../models/user");
const Product = require("../models/product");

exports.createOrder = async (req, res) => {
  try {
    // Support two modes:
    // - API mode: client provides `user` (ObjectId) and `items` array
    // - Frontend form mode: client provides `name`, `coffee_type`, `quantity` (simple form)

    // Frontend form mode
    if (req.body.coffee_type && req.body.name) {
      const customerName = String(req.body.name || "").trim();
      const coffeeType = String(req.body.coffee_type || "")
        .trim()
        .toLowerCase();
      const qty = Number(req.body.quantity) || 1;

      // find product by slug or fallback by name
      let product = await Product.findOne({ slug: coffeeType });
      if (!product)
        product = await Product.findOne({ name: new RegExp(coffeeType, "i") });
      if (!product)
        return res
          .status(400)
          .json({ error: `Product not found for coffee_type=${coffeeType}` });

      const items = [
        {
          productId: product._id,
          name: product.name,
          qty,
          price: product.price ?? 10000,
        },
      ];
      const total = items.reduce(
        (s, it) => s + (it.qty || 0) * (it.price || 0),
        0
      );

      // Some deployments have collection-level validation that requires a `user` field.
      // If frontend doesn't provide a user, attach (or create) a shared guest user so
      // the document satisfies DB-level JSON schema validators while still storing
      // the customer's provided name in `customerName`.
      let guestUser = await User.findOne({
        email: process.env.GUEST_USER_EMAIL || "guest@papiki.local",
      });
      if (!guestUser) {
        try {
          guestUser = new User({
            name: "Guest",
            email: process.env.GUEST_USER_EMAIL || "guest@papiki.local",
          });
          await guestUser.save();
          console.log(
            "Created guest user for anonymous orders:",
            guestUser._id
          );
        } catch (e) {
          // If creation fails (race / unique index) try to re-fetch
          guestUser = await User.findOne({
            email: process.env.GUEST_USER_EMAIL || "guest@papiki.local",
          });
        }
      }

      const orderData = { customerName, items, total, status: "pending" };
      if (guestUser && guestUser._id) orderData.user = guestUser._id;
      const order = new Order(orderData);
      await order.save();
      await order.populate("items.productId", "name price image");
      return res.status(201).json({ success: true, id: order._id });
    }

    // API mode
    const { user, items, status } = req.body;
    if (!user || !mongoose.isValidObjectId(user))
      return res
        .status(400)
        .json({ error: "user field required and must be ObjectId" });
    const u = await User.findById(user);
    if (!u) return res.status(400).json({ error: "Referenced user not found" });

    // normalize items: allow either { productId, qty } or { name, qty, price }
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: "items array is required" });

    const processedItems = [];
    for (const it of items) {
      const qty = Number(it.qty) || 1;
      if (it.productId && mongoose.isValidObjectId(it.productId)) {
        const product = await Product.findById(it.productId);
        if (!product)
          return res
            .status(400)
            .json({ error: `Product not found: ${it.productId}` });
        processedItems.push({
          productId: product._id,
          name: product.name,
          qty,
          price: product.price ?? 10000,
        });
      } else if (it.name) {
        processedItems.push({
          productId: null,
          name: it.name,
          qty,
          price: it.price ?? 10000,
        });
      } else {
        return res
          .status(400)
          .json({ error: "Each item must include productId or name" });
      }
    }

    const computedTotal = processedItems.reduce(
      (s, it) => s + (it.qty || 0) * (it.price || 0),
      0
    );
    const order = new Order({
      user,
      items: processedItems,
      total: computedTotal,
      status,
    });
    await order.save();
    await order.populate("user", "name email");
    await order.populate("items.productId", "name price image");
    return res.status(201).json({ success: true, id: order._id });
  } catch (err) {
    console.error("Order creation error:", err);
    // Mongoose validation
    if (err && err.name === "ValidationError") {
      const details = Object.keys(err.errors || {}).map((k) => ({
        path: k,
        message: err.errors[k].message,
      }));
      return res.status(422).json({ error: "ValidationError", details });
    }

    // MongoDB document-level validation (server-side JSON Schema) returns code 121
    if (
      err &&
      (err.code === 121 ||
        (err.errorResponse && err.errorResponse.code === 121))
    ) {
      const info =
        err.errorResponse?.errInfo || err.errInfo || err.errorResponse || null;
      console.error(
        "MongoDB document validation failure details:",
        JSON.stringify(info, null, 2)
      );
      return res
        .status(422)
        .json({ error: "MongoServerDocumentValidation", details: info });
    }

    res.status(400).json({ error: err.message || String(err) });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.user && mongoose.isValidObjectId(req.query.user))
      filter.user = req.query.user;
    if (req.query.status) filter.status = req.query.status;
    const orders = await Order.find(filter)
      .populate("user", "name email")
      .populate("items.productId", "name price")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "Invalid ID" });
    const order = await Order.findById(id)
      .populate("user", "name email")
      .populate("items.productId", "name price");
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "Invalid ID" });
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (req.body.items) {
      const processedItems = [];
      for (const it of req.body.items) {
        const qty = Number(it.qty) || 1;
        if (it.productId && mongoose.isValidObjectId(it.productId)) {
          const product = await Product.findById(it.productId);
          if (!product)
            return res
              .status(400)
              .json({ error: `Product not found: ${it.productId}` });
          processedItems.push({
            productId: product._id,
            name: product.name,
            qty,
            price: product.price ?? 10000,
          });
        } else if (it.name) {
          processedItems.push({
            productId: null,
            name: it.name,
            qty,
            price: it.price ?? 10000,
          });
        } else {
          return res
            .status(400)
            .json({ error: "Each item must include productId or name" });
        }
      }
      order.items = processedItems;
      order.total = processedItems.reduce(
        (s, it) => s + (it.qty || 0) * (it.price || 0),
        0
      );
    }
    if (req.body.status) order.status = req.body.status;

    await order.save();
    await order.populate("user", "name email");
    res.json(order);
  } catch (err) {
    console.error("Order update error:", err);
    if (err && err.name === "ValidationError") {
      const details = Object.keys(err.errors || {}).map((k) => ({
        path: k,
        message: err.errors[k].message,
      }));
      return res.status(422).json({ error: "ValidationError", details });
    }
    res.status(400).json({ error: err.message || String(err) });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ error: "Invalid ID" });
    const order = await Order.findByIdAndDelete(id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
