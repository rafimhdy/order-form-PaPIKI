const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: { type: String, select: false },
    isAdmin: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// unique constraint is declared on the field via `unique: true` so no extra
// schema.index call is needed here to avoid duplicate index warnings.

module.exports = mongoose.model("User", UserSchema);
