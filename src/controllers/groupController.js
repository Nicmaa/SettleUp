const Group = require('../models/Group.js');
const User = require('../models/User.js');
const Transaction = require('../models/Transaction.js');
const ExpressError = require('../utilities/expressError.js');
const { validateParticipants } = require('../middleware.js');

module.exports.index = async (req, res) => {
    const groups = await Group.find({ participants: req.user._id })
        .populate('participants', 'username avatar')
        .populate('transactions')
        .sort({ updatedAt: -1 });

    res.render('groups/index', { groups });
};

module.exports.createGroup = async (req, res) => {
    const { name, description, participants, image, invitedNames, invitedEmails } = req.body;

    const invitedUsers = [];

    for (let i = 0; i < invitedEmails.length; i++) {
        const email = invitedEmails[i];
        if (email && email.trim()) {
            const name = invitedNames[i] && invitedNames[i].trim()
                ? invitedNames[i].trim()
                : `Invitato ${i + 1}`;

            invitedUsers.push({ email, name });
        }
    }

    const validation = validateParticipants(participants, invitedUsers, req.user._id);
    if (!validation.isValid) {
        req.flash('error', validation.message);
        return res.redirect('/groups/new');
    }

    const group = new Group({
        name,
        image: image || undefined,
        description,
        participants: validation.participants,
        owner: req.user._id,
        invitedUsers: invitedUsers,
    });

    await group.save();
    req.flash('success', 'Gruppo creato con successo!');
    res.redirect(`/groups/${group._id}`);
};

module.exports.renderNewForm = async (req, res) => {
    const user = await User.findById(req.user._id).populate("friends", "username");
    res.render('groups/new', { user });
};

module.exports.showGroup = async (req, res) => {
    const group = await Group.findById(req.params.id)
        .populate('participants', 'username avatar')
        .populate('owner', 'username')
        .populate({
            path: 'transactions',
            options: { sort: { createdAt: -1 } },
            populate: [
                { path: 'amounts.user', select: 'username' },
            ]
        });

    if (!group) throw new ExpressError("Gruppo non trovato!", 404);
    const topSpender = await group.topSpender();

    res.render('groups/show', { group, topSpender });
};

module.exports.renderEditForm = async (req, res) => {
    const group = await Group.findById(req.params.id).populate('participants', 'username avatar');
    const user = await User.findById(req.user._id).populate("friends", "username");

    if (!group) throw new ExpressError("Gruppo non trovato!", 404);
    res.render('groups/edit', { group, user });
};

module.exports.editGroup = async (req, res) => {

    const validation = validateParticipants(req.body.participants, req.user._id);
    if (!validation.isValid) {
        req.flash('error', validation.message);
        return res.redirect(`/groups/${req.params.id}/edit`);
    }

    const { name, image, description } = req.body;
    const group = await Group.findByIdAndUpdate(
        req.params.id,
        {
            name,
            image: image || undefined,
            description,
            participants: validation.participants,
            updatedAt: Date.now()
        },
        { new: true, runValidators: true },
    );

    if (!group) throw new ExpressError("Gruppo non trovato!", 404);

    req.flash('success', 'Gruppo modificato con successo!');
    res.redirect(`/groups/${group._id}`);
};

module.exports.deleteGroup = async (req, res) => {
    const group = await Group.findById(req.params.id);
    if (!group) throw new ExpressError("Gruppo non trovato!", 404);

    await Promise.all([
        Transaction.deleteMany({ group: group._id }),
        Group.findByIdAndDelete(req.params.id)
    ]);

    req.flash('success', 'Gruppo eliminato con successo!');
    res.redirect('/groups');
};
