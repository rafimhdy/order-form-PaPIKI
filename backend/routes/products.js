const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { adminOnly } = require("../middleware/auth");

// public product listing
router.get("/", productController.getProducts);
router.get("/:id", productController.getProductById);

// admin-only actions
router.post("/", adminOnly, productController.createProduct);
router.put("/:id", adminOnly, productController.updateProduct);
router.delete("/:id", adminOnly, productController.deleteProduct);

module.exports = router;
