const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

// Register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: "User exists" });

    const hashed = await bcrypt.hash(password, 10);

    user = new User({ name, email, password: hashed });
    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    setAuthCookie(res, token);

    res.status(201).json({ 
      msg: "User registered successfully",
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json(err.message);
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid email" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Wrong password" });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    setAuthCookie(res, token);
    res.json({ msg: "Login successful" });
  } catch (err) {
    res.status(500).json(err.message);
  }
};

// Current user
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "_id name email phone timezone reminderTime reminderEnabled reminderChannels"
    );
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json(err.message);
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const updates = {};

    if (typeof req.body.name === "string") {
      updates.name = req.body.name.trim() || "";
    }

    if (typeof req.body.phone === "string") {
      updates.phone = req.body.phone.trim();
    }

    if (typeof req.body.timezone === "string") {
      updates.timezone = req.body.timezone.trim() || "UTC";
    }

    if (typeof req.body.reminderTime === "string") {
      updates.reminderTime = req.body.reminderTime;
    }

    if (typeof req.body.reminderEnabled === "boolean") {
      updates.reminderEnabled = req.body.reminderEnabled;
    }

    if (req.body.reminderChannels && typeof req.body.reminderChannels === "object") {
      updates.reminderChannels = {
        email: !!req.body.reminderChannels.email,
        sms: !!req.body.reminderChannels.sms
      };
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true
    }).select("_id name email phone timezone reminderTime reminderEnabled reminderChannels");

    res.json({ user });
  } catch (err) {
    res.status(500).json(err.message);
  }
};

// Logout
exports.logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  res.json({ msg: "Logged out" });
};
