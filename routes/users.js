const express = require('express');
const router = express.Router();
const passport = require('passport');

const catchAsync = require('../utilities/catchAsync');
const User = require('../models/User');
const { storeReturnTo } = require('../middleware');

router.get('/register', (req, res) => {
    res.render('users/register');
});

router.post('/register', catchAsync(async (req, res) => {
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
        res.redirect('register');
    }
}));

router.get('/login', (req, res) => {
    res.render('users/login');
});

router.post('/login', storeReturnTo, passport.authenticate('local', { failureFlash: true, failureRedirect: '/api/users/login' }), catchAsync(async (req, res) => {
    req.flash('success', `Bentornato ${req.body.username}!`);
    const redirectUrl = res.locals.returnTo || '/api/groups';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
}));

router.get('/logout', (req, res) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.flash('success', `Disconesso correttamente!`);
        res.render('home');
    })
});

module.exports = router;
