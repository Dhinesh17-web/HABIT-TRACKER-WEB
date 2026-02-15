"use strict";

const router = require("express").Router();

router.use("/auth", require("./authRoutes"));
router.use("/habits", require("./habitRoutes"));

module.exports = router;
