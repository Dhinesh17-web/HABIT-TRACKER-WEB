"use strict";

const router = require("express").Router();
const authController = require("../controllers/authController");
const createRateLimiter = require("../middleware/rateLimit");
const auth = require("../middleware/authMiddleware");

const registerHandler = authController.register || authController.registerUser;
const loginHandler = authController.login || authController.loginUser;

if (!registerHandler || !loginHandler) {
	throw new Error("Auth controller handlers are missing");
}

const authLimiter = createRateLimiter({
	windowMs: 10 * 60 * 1000,
	max: 20,
	message: "Too many auth attempts. Please try again in a few minutes."
});

router.post("/register", authLimiter, registerHandler);
router.post("/login", authLimiter, loginHandler);
router.get("/me", auth, authController.me);
router.patch("/profile", auth, authController.updateProfile);
router.post("/logout", auth, authController.logout);

module.exports = router;
