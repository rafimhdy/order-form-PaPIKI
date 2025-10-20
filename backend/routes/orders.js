const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { adminOnly } = require("../middleware/auth");

// public: create order from frontend form
router.post("/", orderController.createOrder);

// admin-only: manage orders
router.get("/", adminOnly, orderController.getOrders);
router.get("/:id", adminOnly, orderController.getOrderById);
router.put("/:id", adminOnly, orderController.updateOrder);
router.delete("/:id", adminOnly, orderController.deleteOrder);

module.exports = router;
