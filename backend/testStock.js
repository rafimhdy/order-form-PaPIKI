const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Order = require("./models/order");
const Product = require("./models/product");

dotenv.config();
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/order-form-PaPIKI";

async function testStockAdjustment() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Find a pending order
    const pendingOrder = await Order.findOne({ status: "pending" });
    if (!pendingOrder) {
      console.log("No pending order found");
      return;
    }

    console.log(
      "Testing with order:",
      pendingOrder._id,
      "status:",
      pendingOrder.status
    );

    // Check stock before
    for (const item of pendingOrder.items) {
      if (item.productId) {
        const product = await Product.findById(item.productId);
        console.log(`Before: ${product.name} stock=${product.stock}`);
      }
    }

    // Update status to cancelled
    const oldStatus = pendingOrder.status;
    pendingOrder.status = "cancelled";
    await pendingOrder.save();

    // Adjust stock
    if (oldStatus !== pendingOrder.status) {
      for (const item of pendingOrder.items) {
        if (item.productId) {
          const product = await Product.findById(item.productId);
          if (product) {
            if (
              oldStatus === "pending" &&
              pendingOrder.status === "cancelled"
            ) {
              product.stock += item.qty;
            }
            await product.save();
            console.log(`After: ${product.name} stock=${product.stock}`);
          }
        }
      }
    }

    console.log("Order status updated to cancelled");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

testStockAdjustment();
