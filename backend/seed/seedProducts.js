const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("../models/product");

dotenv.config();
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/order-form-PaPIKI";

const defaultProducts = [
  {
    name: "Robusta",
    slug: "robusta",
    price: 10000,
    image: "/assets/robusta.png",
    description: "Robusta",
  },
  {
    name: "Arabika Natural",
    slug: "arabikanatural",
    price: 10000,
    image: "/assets/arabikanatural.png",
    description: "Arabika Natural",
  },
  {
    name: "Arabika Eksperimental",
    slug: "arabikaeksperimental",
    price: 10000,
    image: "/assets/arabikaeksperimental.png",
    description: "Arabika Eksperimental",
  },
  {
    name: "Arabika Honey",
    slug: "arabikahoney",
    price: 10000,
    image: "/assets/arabikahoney.png",
    description: "Arabika Honey",
  },
  {
    name: "Arabika Full Wash",
    slug: "arabikafullwash",
    price: 10000,
    image: "/assets/arabikafullwash.png",
    description: "Arabika Full Wash",
  },
];

async function seed() {
  try {
    // keep options minimal to avoid deprecation warnings from underlying driver
    await mongoose.connect(MONGO_URI);
    console.log("Seeder connected to", MONGO_URI);

    for (const p of defaultProducts) {
      const slug = p.slug;
      const existing = await Product.findOne({ slug });
      if (existing) {
        console.log("Product exists, skipping:", p.name);
        continue;
      }
      await Product.create(p);
      console.log("Inserted product:", p.name);
    }

    // ensure a guest user exists for anonymous orders
    try {
      const User = require("../models/user");
      const GUEST_EMAIL = process.env.GUEST_USER_EMAIL || "guest@papiki.local";
      await User.updateOne(
        { email: GUEST_EMAIL },
        { $setOnInsert: { name: "Guest", email: GUEST_EMAIL } },
        { upsert: true }
      );
      console.log("Ensured guest user exists:", GUEST_EMAIL);
    } catch (err) {
      console.error(
        "Could not create guest user during seeding:",
        err.message || err
      );
    }

    // ensure an admin user exists (password from env or default 'admin123')
    try {
      const bcrypt = require("bcryptjs");
      const User = require("../models/user");
      const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@papiki.local";
      const ADMIN_PW = process.env.ADMIN_PASSWORD || "admin123";
      const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
      if (!existingAdmin) {
        const hashed = await bcrypt.hash(ADMIN_PW, 10);
        await User.create({
          name: "Admin",
          email: ADMIN_EMAIL,
          password: hashed,
          isAdmin: true,
        });
        console.log(
          "Inserted admin user:",
          ADMIN_EMAIL,
          "(password from env or default)"
        );
      } else {
        console.log("Admin user already exists:", ADMIN_EMAIL);
      }
    } catch (err) {
      console.error(
        "Could not create admin user during seeding:",
        err.message || err
      );
    }

    await mongoose.disconnect();
    console.log("Seeder finished");
  } catch (err) {
    console.error("Seeder error:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0));
}

module.exports = { seed };
