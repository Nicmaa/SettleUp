const User = require('../models/User');

module.exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ email, username });
        const newUser = await User.register(user, password);
        req.login(newUser, err => {
            if (err) return next(err);
            req.flash('success', `Benvenuto ${newUser.username}!`);
            res.redirect('/groups');
        })
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/');
    }
};

module.exports.login = (req, res) => {
    req.flash('success', `Bentornato ${req.body.username}!`);
    const redirectUrl = res.locals.returnTo || '/groups';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
};

module.exports.logout = (req, res) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.flash('success', `Disconesso correttamente!`);
        res.redirect('/');
    })
};

module.exports.profile = async (req, res) => {
    const user = await User.findById(req.user._id);
    res.render('users/profile', { user });
};

module.exports.renderEditProfile = async (req, res) => {
    const user = await User.findById(req.user._id);
    res.render('users/edit', { user });
};

module.exports.editProfile = async (req, res) => {
    const { email, avatar } = req.body;
    
    await User.findByIdAndUpdate(req.user._id, {
        email,
        avatar
    }, { runValidators: true });
    
    req.flash('success', 'Profilo modificato correttamente!');
    res.redirect('/users/profile');
};
