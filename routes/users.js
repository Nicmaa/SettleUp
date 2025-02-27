const express = require('express');
const router = express.Router();
const passport = require('passport');

const catchAsync = require('../utilities/catchAsync');
const User = require('../models/User');
const { isLoggedIn, storeReturnTo, validatePasswordStrength } = require('../middleware');

router.post('/register', validatePasswordStrength, catchAsync(async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ email, username });
        const newUser = await User.register(user, password);
        req.login(newUser, err => {
            if (err) return next(err);
            req.flash('success', `Benvenuto ${newUser.username}!`);
            res.redirect('/api/groups');
        })
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/');
    }
}));

router.post('/login', storeReturnTo, passport.authenticate('local', { failureFlash: true, failureRedirect: '/' }), (req, res) => {
    req.flash('success', `Bentornato ${req.body.username}!`);
    const redirectUrl = res.locals.returnTo || '/api/groups';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
});

router.post('/logout', isLoggedIn, (req, res) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.flash('success', `Disconesso correttamente!`);
        res.redirect('/');
    })
});

router.get('/profile', isLoggedIn, catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id);
    res.render('users/profile', { user });
}));

router.get('/profile/edit', isLoggedIn, catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id);
    res.render('users/edit', { user });
}));

router.put('/profile', isLoggedIn, catchAsync(async (req, res) => {
    const { email, avatar } = req.body;
    
    await User.findByIdAndUpdate(req.user._id, {
        email,
        avatar
    }, { runValidators: true });
    
    req.flash('success', 'Profilo modificato correttamente!');
    res.redirect('/api/users/profile');
}));

router.post('/change-password', isLoggedIn, validatePasswordStrength, catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id);
    await user.changePassword(currentPassword, newPassword);
    await user.save();
    
    req.flash('success', 'Password modificata correttamente!');
    res.redirect('/api/users/profile');
}));

module.exports = router;
