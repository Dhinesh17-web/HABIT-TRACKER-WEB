const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const {
  addHabit,
  getHabits,
  deleteHabit,
  completeHabit,
  updateHabit
} = require("../controllers/habitController");

router.post("/", auth, addHabit);
router.get("/", auth, getHabits);
router.delete("/:id", auth, deleteHabit);
router.patch("/:id/complete", auth, completeHabit);
router.patch("/:id", auth, updateHabit);

module.exports = router;
