const express = require('express');
const router = express.Router();
const passport = require('passport');
const user = require('../controllers/userController');
const catchAsync = require('../utilities/catchAsync');
const { isLoggedIn, storeReturnTo, validatePasswordStrength, validateUser } = require('../middleware');

// Autenticazione
router.post('/register', catchAsync(user.register));
router.post('/login', storeReturnTo, passport.authenticate('local', { failureFlash: true, failureRedirect: '/' }), user.login);
router.post('/logout', isLoggedIn, user.logout);

// Profilo utente
router.route('/profile')
    .get(isLoggedIn, catchAsync(user.profile))
    .put(isLoggedIn, validateUser, catchAsync(user.editProfile))
    .delete(isLoggedIn, catchAsync(user.deleteProfile));

router.get('/profile/edit', isLoggedIn, catchAsync(user.renderEditProfile));

// Amicizia
router.route('/friends')
    .post(isLoggedIn, catchAsync(user.sendFriendRequest))
    .delete(isLoggedIn, catchAsync(user.removeFriend));

router.route('/friends/requests')
    .post(isLoggedIn, catchAsync(user.respondFriendRequest))
    .delete(isLoggedIn, catchAsync(user.cancelFriendRequest));

// Impostazioni
router.route('/settings')
    .get(isLoggedIn, catchAsync(user.renderSettings))
    .patch(isLoggedIn, catchAsync(user.changeSettings));

router.patch('/settings/password', isLoggedIn, catchAsync(user.changePassword));
  
module.exports = router;
