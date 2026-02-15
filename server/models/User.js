const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    timezone: { type: String, default: "UTC" },
    reminderTime: { type: String, default: "20:00" },
    reminderEnabled: { type: Boolean, default: false },
    reminderChannels: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    lastReminderKey: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
