const express = require("express");
const router = express.Router();
const {
    insertApp,
} = require("../controllers/app");
const isAuthenticated = require("../middleware/isAuth");

router.post("/", isAuthenticated,insertApp);

module.exports = router;