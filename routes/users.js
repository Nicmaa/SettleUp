const express = require('express');
const router = express.Router();
const passport = require('passport');

const user = require('../controllers/userController');

const catchAsync = require('../utilities/catchAsync');
const { isLoggedIn, storeReturnTo, validatePasswordStrength } = require('../middleware');

router.post('/register', validatePasswordStrength, catchAsync(user.register));

router.post('/login', storeReturnTo, passport.authenticate('local', { failureFlash: true, failureRedirect: '/' }), user.login);

router.post('/logout', isLoggedIn, user.logout);

router.route('/profile')
    .get(isLoggedIn, catchAsync(user.profile))
    .put(isLoggedIn, catchAsync(user.editProfile));
    // Manca il .delete

router.get('/profile/edit', isLoggedIn, catchAsync(user.renderEditProfile));

router.post('/change-password', isLoggedIn, validatePasswordStrength, catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    await user.changePassword(currentPassword, newPassword);
    await user.save();

    req.flash('success', 'Password modificata correttamente!');
    res.redirect('/users/profile');
}));

module.exports = router;
