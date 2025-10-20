const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { adminOnly } = require("../middleware/auth");

// All user management endpoints are admin-only
router.use(adminOnly);

router.post("/", userController.createUser);
router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

module.exports = router;
