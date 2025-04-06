const { validatePasswordStrength } = require('../middleware');
const User = require('../models/User');

module.exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const validation = validatePasswordStrength(password);
        if (!validation.isValid) {
            req.flash('error', validation.message);
            return res.redirect('/');
        }
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
    const user = await User.findById(req.user._id)
        .populate("friends")
        .populate("friendRequests")
        .populate("sentRequests");
    res.render('users/profile', { user });
};

module.exports.renderEditProfile = async (req, res) => {
    const user = await User.findById(req.user._id);
    res.render('users/edit', { user });
};

module.exports.editProfile = async (req, res) => {
    const { email, avatar, bio, firstName, lastName } = req.body;

    await User.findByIdAndUpdate(req.user._id, {
        email,
        avatar: avatar || '/images/default_avatar.jpg',
        bio,
        firstName,
        lastName,
    }, { runValidators: true });

    req.flash('success', 'Profilo modificato correttamente!');
    res.redirect('/users/profile');
};

module.exports.deleteProfile = async (req, res) => {
    await User.findByIdAndDelete(req.user._id);
    req.flash('success', 'Profilo eliminato correttamente!');
    res.redirect('/');
};

module.exports.sendFriendRequest = async (req, res) => {
    const receiverUsername = req.body.receiverUsername;
    const sender = await User.findById(req.user._id);
    const receiver = await User.findOne({ username: receiverUsername });
    if (!receiver) {
        req.flash('error', "Utente non trovato!");
        return res.redirect('/users/profile');
    }

    if (receiver.friendRequests.includes(req.user._id) || sender.sentRequests.includes(receiver._id)) {
        req.flash('error', "Richiesta già inviata!");
        return res.redirect('/users/profile');
    }

    receiver.friendRequests.push(req.user._id);
    sender.sentRequests.push(receiver._id);

    await sender.save();
    await receiver.save();

    req.flash('success', "Richiesta di amicizia inviata!");
    res.redirect('/users/profile');
};

module.exports.respondFriendRequest = async (req, res) => {
    const { senderId, accepted } = req.body;
    const user = await User.findById(req.user._id);
    const sender = await User.findById(senderId);

    if (!user || !sender) {
        req.flash('error', "Utente non trovato!");
        return res.redirect('/users/profile');
    }

    if (!user.friendRequests.includes(senderId)) {
        req.flash('error', "Richiesta non trovata!");
        return res.redirect('/users/profile');
    }

    user.friendRequests = user.friendRequests.filter(id => id.toString() !== senderId);
    sender.sentRequests = sender.sentRequests.filter(id => id.toString() !== user._id.toString());

    if (accepted === "true") {
        user.friends.push(senderId);
        sender.friends.push(user._id);
    }

    await user.save();
    await sender.save();

    req.flash('success', accepted === "true" ? "Amicizia accettata" : "Richiesta rifiutata");
    res.redirect('/users/profile');
};

module.exports.removeFriend = async (req, res) => {
    const { friendId } = req.body;
    const user = await User.findById(req.user._id);
    const friend = await User.findById(friendId);

    if (!user || !friend) {
        req.flash('error', "Utente non trovato!");
        return res.redirect('/users/profile');
    }

    user.friends = user.friends.filter(id => id.toString() !== friendId);
    friend.friends = friend.friends.filter(id => id.toString() !== user._id.toString());

    await user.save();
    await friend.save();

    req.flash('success', "Amico rimosso con successo.");
    res.redirect('/users/profile');
};

module.exports.cancelFriendRequest = async (req, res) => {
    const { receiverId } = req.body;
    const sender = await User.findById(req.user._id);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
        req.flash('error', "Utente non trovato!");
        return res.redirect('/users/profile');
    }

    sender.sentRequests = sender.sentRequests.filter(id => id.toString() !== receiverId);
    receiver.friendRequests = receiver.friendRequests.filter(id => id.toString() !== sender._id.toString());

    await sender.save();
    await receiver.save();

    req.flash('success', "Richiesta di amicizia annullata.");
    res.redirect('/users/profile');
};

module.exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        req.flash('error', 'Le password non corrispondono!');
        return res.redirect('/users/settings');
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
        req.flash('error', validation.message);
        return res.redirect('/users/settings');
    }

    try {
        const user = await User.findById(req.user._id);
        await user.changePassword(currentPassword, newPassword);
        await user.save();

        req.flash('success', 'Password modificata correttamente!');
        res.redirect('/users/settings');
    } catch (err) {
        if (err.name === 'IncorrectPasswordError') {
            req.flash('error', 'La password attuale non è corretta!');
        } else {
            req.flash('error', 'Errore durante il cambio password. Riprova.');
        }
        res.redirect('/users/settings');
    }
};

module.exports.renderSettings = async (req, res) => {
    const user = await User.findById(req.user._id);
    res.render('users/settings', { user });
}

module.exports.changeSettings = async (req, res) => {
    const user = await User.findById(req.user._id);
    const notificationSettings = {
        email: {
            newExpense: false,
            paymentReminder: false,
            friendRequest: false,
            groupInvite: false
        },
        app: {
            newExpense: false,
            paymentReminder: false,
            friendRequest: false,
            groupInvite: false
        }
    };
    const formData = req.body.notifications || {};
    Object.keys(notificationSettings).forEach(channel => {
        if (formData[channel]) {
            Object.keys(notificationSettings[channel]).forEach(setting => {
                if (formData[channel][setting]) {
                    notificationSettings[channel][setting] = true;
                }
            });
        }
    });

    user.settings.notifications = notificationSettings;
    await user.save();
    res.redirect('/users/settings');
}
