const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const usersRouter = require("./routes/users");
const ordersRouter = require("./routes/orders");
const productsRouter = require("./routes/products");
const authRouter = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/order-form-PaPIKI";

// seed helper (only used in development) - will not throw if left out
let seedProducts;
try {
  seedProducts = require("./seed/seedProducts").seed;
} catch (e) {
  seedProducts = null;
}

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Sukses terhubung ke MongoDB!");
    if (seedProducts) {
      // seed only when database is empty
      try {
        const Product = require("./models/product");
        const count = await Product.countDocuments();
        if (count === 0) {
          console.log("Database empty — running product seeder");
          await seedProducts();
        }
      } catch (err) {
        console.error("Seeder check failed:", err.message || err);
      }
    }
  })
  .catch((err) => console.error("Gagal terhubung ke MongoDB:", err));

// register routers
app.use("/api/users", usersRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/products", productsRouter);
app.use("/api/auth", authRouter);

// simple healthcheck
app.get("/", (req, res) => res.json({ message: "Order-form API" }));

// basic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server berjalan di http://localhost:" + port);
});
