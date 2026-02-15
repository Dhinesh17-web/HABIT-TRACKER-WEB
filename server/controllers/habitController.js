const Habit = require("../models/Habit");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeScheduleDays = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  const filtered = value
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);

  return filtered.length > 0 ? Array.from(new Set(filtered)) : [0, 1, 2, 3, 4, 5, 6];
};

const normalizeGoalType = (value) => {
  return value === "daily" ? "daily" : "weekly";
};

const normalizeGoalTarget = (value, goalType) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return goalType === "daily" ? 1 : 3;
  }
  const clamped = Math.min(Math.max(Math.round(parsed), 1), 14);
  return goalType === "daily" ? 1 : clamped;
};

// Add Habit
exports.addHabit = async (req, res) => {
  try {
    const title = (req.body.title || "").trim();
    const category = (req.body.category || "General").trim();
    const group = (req.body.group || "Personal").trim();
    const goalType = normalizeGoalType(req.body.goalType);
    const goalTarget = normalizeGoalTarget(req.body.goalTarget, goalType);

    if (!title) {
      return res.status(400).json({ msg: "Title is required" });
    }

    const existing = await Habit.findOne({
      userId: req.user.id,
      title: { $regex: `^${escapeRegex(title)}$`, $options: "i" }
    });

    if (existing) {
      return res.status(400).json({ msg: "Habit title already exists" });
    }

    const habit = new Habit({
      userId: req.user.id,
      title,
      category: category || "General",
      group: group || "Personal",
      scheduleDays: normalizeScheduleDays(req.body.scheduleDays),
      goalType,
      goalTarget
    });

    await habit.save();
    res.status(201).json(habit);
  } catch (err) {
    res.status(500).json(err.message);
  }
};

// Get Habits
exports.getHabits = async (req, res) => {
  const habits = await Habit.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(habits);
};

// Delete Habit
exports.deleteHabit = async (req, res) => {
  const habit = await Habit.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!habit) {
    return res.status(404).json({ msg: "Habit not found" });
  }

  res.json({ msg: "Deleted" });
};

// Mark Complete
exports.completeHabit = async (req, res) => {
  const habit = await Habit.findOne({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!habit) {
    return res.status(404).json({ msg: "Habit not found" });
  }

  const today = new Date();
  const alreadyDone = habit.completedDates.some((date) => {
    const parsed = new Date(date);
    return (
      parsed.getFullYear() === today.getFullYear() &&
      parsed.getMonth() === today.getMonth() &&
      parsed.getDate() === today.getDate()
    );
  });

  if (!alreadyDone) {
    habit.completedDates.push(today);
    await habit.save();
  }

  res.json(habit);
};

// Update Habit
exports.updateHabit = async (req, res) => {
  try {
    const updates = {};
    if (typeof req.body.title === "string") {
      const title = req.body.title.trim();
      if (!title) {
        return res.status(400).json({ msg: "Title is required" });
      }

      const existing = await Habit.findOne({
        userId: req.user.id,
        _id: { $ne: req.params.id },
        title: { $regex: `^${escapeRegex(title)}$`, $options: "i" }
      });

      if (existing) {
        return res.status(400).json({ msg: "Habit title already exists" });
      }

      updates.title = title;
    }

    if (typeof req.body.category === "string") {
      updates.category = req.body.category.trim() || "General";
    }

    if (typeof req.body.group === "string") {
      updates.group = req.body.group.trim() || "Personal";
    }

    if (req.body.scheduleDays !== undefined) {
      updates.scheduleDays = normalizeScheduleDays(req.body.scheduleDays);
    }

    if (req.body.goalType !== undefined) {
      updates.goalType = normalizeGoalType(req.body.goalType);
      updates.goalTarget = normalizeGoalTarget(req.body.goalTarget, updates.goalType);
    } else if (req.body.goalTarget !== undefined) {
      updates.goalTarget = normalizeGoalTarget(req.body.goalTarget, "weekly");
    }

    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updates,
      { new: true }
    );

    if (!habit) {
      return res.status(404).json({ msg: "Habit not found" });
    }

    res.json(habit);
  } catch (err) {
    res.status(500).json(err.message);
  }
};
