const express = require('express');
const router = express.Router();
const passport = require('passport');

const user = require('../controllers/userController');

const catchAsync = require('../utilities/catchAsync');
const { isLoggedIn, storeReturnTo, validatePasswordStrength, validateUser } = require('../middleware');

router.post('/register', validatePasswordStrength, catchAsync(user.register));

router.post('/login', storeReturnTo, passport.authenticate('local', { failureFlash: true, failureRedirect: '/' }), user.login);

router.post('/logout', isLoggedIn, user.logout);

router.route('/profile')
    .get(isLoggedIn, catchAsync(user.profile))
    .put(isLoggedIn, validateUser, catchAsync(user.editProfile));
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

router.route('/friends')
    .post(isLoggedIn, catchAsync(user.sendFriendRequest))
    .delete(isLoggedIn, catchAsync(user.removeFriend));

router.route('/friends/requests')
    .post(isLoggedIn, catchAsync(user.respondFriendRequest))
    .delete(isLoggedIn, catchAsync(user.cancelFriendRequest));

module.exports = router;
