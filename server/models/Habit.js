const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    title: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: "General"
    },
    group: {
      type: String,
      default: "Personal"
    },
    scheduleDays: {
      type: [Number],
      default: [0, 1, 2, 3, 4, 5, 6]
    },
    goalType: {
      type: String,
      enum: ["weekly", "daily"],
      default: "weekly"
    },
    goalTarget: {
      type: Number,
      default: 3
    },
    goalUnit: {
      type: String,
      enum: ["times"],
      default: "times"
    },
    completedDates: [
      {
        type: Date
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Habit", habitSchema);
