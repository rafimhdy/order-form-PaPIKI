const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("./models/product");

dotenv.config();
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/order-form-PaPIKI";

async function migrateStock() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Set stock to 100 for all products that don't have stock or have stock 0
    const result = await Product.updateMany(
      { $or: [{ stock: { $exists: false } }, { stock: 0 }] },
      { $set: { stock: 100 } }
    );

    console.log(`Set stock to 100 for ${result.modifiedCount} products`);

    // Remove old 'available' field from all products
    await Product.updateMany({}, { $unset: { available: 1 } });

    console.log("Removed old 'available' field from all products");

    await mongoose.disconnect();
    console.log("Migration completed");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  migrateStock().then(() => process.exit(0));
}

module.exports = { migrateStock };
