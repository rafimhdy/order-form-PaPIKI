const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1, default: 1 },
    price: { type: Number, required: true, min: 0, default: 10000 },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    customerName: { type: String, default: "" },
    items: { type: [ItemSchema], default: [] },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

// Compute total automatically when items change or total missing
OrderSchema.pre("validate", function (next) {
  if (Array.isArray(this.items)) {
    // ensure qty and price are numbers and have sensible defaults
    this.items = this.items.map((it) => {
      const qty = Number(it.qty) || 1;
      const price = Number(it.price);
      return {
        productId: it.productId ?? null,
        name: it.name ?? "Unknown Item",
        qty: qty < 1 ? 1 : qty,
        price: Number.isFinite(price) ? price : 10000,
      };
    });
    // always recompute total from items
    this.total = this.items.reduce(
      (s, it) => s + (it.qty || 0) * (it.price || 0),
      0
    );
  }
  next();
});

module.exports = mongoose.model("Order", OrderSchema);
