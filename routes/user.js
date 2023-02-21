const express = require("express");
const router = express.Router();
const {
    getAllUser,
} = require("../controllers/user");
const isAuthenticated = require("../middleware/isAuth");

router.get("/", isAuthenticated,getAllUser);

module.exports = router;