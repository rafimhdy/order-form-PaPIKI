const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    price: { type: Number, required: true, default: 10000, min: 0 },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 1 }, { unique: true });
ProductSchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.model("Product", ProductSchema);
