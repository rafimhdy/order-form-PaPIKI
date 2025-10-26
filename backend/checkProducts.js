const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("./models/product");

dotenv.config();
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/order-form-PaPIKI";

async function checkProducts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const products = await Product.find({});
    console.log("Products:");
    products.forEach((p) => {
      console.log(`${p.name}: stock=${p.stock}, available=${p.available}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

checkProducts();
