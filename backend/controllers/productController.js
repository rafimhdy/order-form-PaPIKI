const Product = require("../models/product");

exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      price = 10000,
      description = "",
      stock = 100,
      image = "",
      slug,
    } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    // compute slug if not provided
    const finalSlug = slug
      ? String(slug).trim().toLowerCase()
      : String(name).replace(/\s+/g, "").toLowerCase();
    const p = new Product({
      name,
      slug: finalSlug,
      price,
      description,
      stock,
      image,
    });
    await p.save();
    res.status(201).json(p);
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ error: "Product already exists" });
    res.status(400).json({ error: err.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ error: "Product not found" });
    res.json(p);
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.name && !updates.slug) {
      updates.slug = String(updates.name).replace(/\s+/g, "").toLowerCase();
    }
    const p = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!p) return res.status(404).json({ error: "Product not found" });
    res.json(p);
  } catch (err) {
    if (err.code === 11000)
      return res
        .status(409)
        .json({ error: "Product with that slug or name already exists" });
    res.status(400).json({ error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const p = await Product.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
};
