const mongoose = require("mongoose");
const Order = require("../models/order");
const User = require("../models/user");
const Product = require("../models/product");
const TelegramBot = require("node-telegram-bot-api");

// Initialize Telegram bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Function to send Telegram message for new order
async function sendTelegramMessage(order) {
  try {
    const customerName =
      order.customerName || (order.user ? order.user.name : "Unknown");
    const itemsText = order.items
      .map((it) => `${it.name} ×${it.qty}`)
      .join(", ");
    const message = `Pesanan baru dari ${customerName}: ${itemsText}, Total: Rp ${Number(
      order.total
    ).toLocaleString()}, Status: ${order.status}`;

    console.log(
      "Sending Telegram to:",
      process.env.TELEGRAM_CHAT_ID,
      "Message:",
      message
    );

    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message);
    console.log("Telegram notification sent for order:", order._id);
  } catch (err) {
    console.error("Failed to send Telegram message:", err.message);
    // Don't fail the order creation if Telegram fails
  }
}

exports.createOrder = async (req, res) => {
  try {
    // Support three modes:
    // 1. Frontend cart checkout (anonymous): client provides `name` and `items` array
    // 2. Frontend form mode: client provides `name`, `coffee_type`, `quantity` (simple form)
    // 3. API mode: client provides `user` (ObjectId) and `items` array

    // Mode 1: Frontend cart checkout (anonymous) - check this first since it has higher priority
    if (Array.isArray(req.body.items)) {
      const customerName = String(req.body.name || "").trim() || "Guest";
      const itemsInput = req.body.items;
      if (!Array.isArray(itemsInput) || itemsInput.length === 0)
        return res.status(400).json({ error: "items array is required" });

      const processedItems = [];
      for (const it of itemsInput) {
        const qty = Number(it.qty) || 1;
        if (it.productId && mongoose.isValidObjectId(it.productId)) {
          const product = await Product.findById(it.productId);
          if (!product)
            return res
              .status(400)
              .json({ error: `Product not found: ${it.productId}` });

          // Check stock availability for each product
          if (product.stock < qty)
            return res.status(400).json({
              error: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
            });

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

      // ensure guest user exists (same logic as earlier)
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
        } catch (e) {
          guestUser = await User.findOne({
            email: process.env.GUEST_USER_EMAIL || "guest@papiki.local",
          });
        }
      }

      const order = new Order({
        customerName,
        user: guestUser && guestUser._id ? guestUser._id : undefined,
        items: processedItems,
        total: computedTotal,
        status: "pending",
      });
      await order.save();
      await order.populate("items.productId", "name price image");

      // decrement stock for processed items
      for (const it of processedItems) {
        if (it.productId) {
          const product = await Product.findById(it.productId);
          if (product) {
            product.stock -= it.qty;
            await product.save();
          }
        }
      }

      await sendTelegramMessage(order);
      return res.status(201).json({ success: true, id: order._id });
    }

    // Mode 2: Frontend form mode (single item)
    if (req.body.coffee_type) {
      const customerName = String(req.body.name || "").trim() || "Guest";
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

      // Check stock availability
      if (product.stock < qty)
        return res.status(400).json({
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
        });

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

      // Decrement stock for pending order
      product.stock -= qty;
      await product.save();

      // Send Telegram notification
      await sendTelegramMessage(order);

      return res.status(201).json({ success: true, id: order._id });
    }

    // Mode 3: API mode (requires user ObjectId)
    const { user, items, status } = req.body;
    if (!user || !mongoose.isValidObjectId(user))
      return res
        .status(400)
        .json({ error: "user field required and must be ObjectId" });
    const apiUser = await User.findById(user);
    if (!apiUser)
      return res.status(400).json({ error: "Referenced user not found" });

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

    // Send Telegram notification
    await sendTelegramMessage(order);

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

    const oldStatus = order.status;

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

    // Adjust stock based on status change
    if (oldStatus !== order.status) {
      for (const item of order.items) {
        if (item.productId) {
          const product = await Product.findById(item.productId);
          if (product) {
            if (oldStatus === "pending" && order.status === "shipped") {
              // Permanent decrement on shipped
              product.stock -= item.qty;
            } else if (
              oldStatus === "pending" &&
              order.status === "cancelled"
            ) {
              // Return stock on cancelled
              product.stock += item.qty;
            } else if (
              oldStatus === "shipped" &&
              order.status === "cancelled"
            ) {
              // Return stock when shipped order is cancelled
              product.stock += item.qty;
            } else if (
              oldStatus === "cancelled" &&
              order.status === "pending"
            ) {
              // Decrement stock when cancelled order is reactivated
              product.stock -= item.qty;
            }
            await product.save();
          }
        }
      }
    }

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
