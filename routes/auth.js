const express = require("express");
const router = express.Router();
const {
    signup,
    signin,
    signout,
    requireSignin,
    resetPassword
} = require("../controllers/auth");
const isAuthenticated = require("../middleware/isAuth");
const { userSignupValidator } = require("../validator");

router.post("/signup", userSignupValidator, signup);
router.post("/signin", signin);
router.get("/signout", isAuthenticated,signout);
router.post("/resetPassword", isAuthenticated,resetPassword);

module.exports = router;