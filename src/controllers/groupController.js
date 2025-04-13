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
    const users = await User.find({});

    const validation = validateParticipants(participants, [], [], invitedNames, invitedEmails, req.user._id, users);
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
        invitedUsers: validation.invited,
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
    const { id } = req.params;
    const { name, description, participants, image, currentInvited, removeInvited, invitedNames, invitedEmails } = req.body;

    const validation = validateParticipants(participants, currentInvited, removeInvited, invitedNames, invitedEmails, req.user._id);
    if (!validation.isValid) {
        req.flash('error', validation.message);
        return res.redirect(`/groups/${id}/edit`);
    }

    const group = await Group.findById(id);
    if (!group) {
        req.flash('error', 'Gruppo non trovato.');
        return res.redirect('/groups');
    }

    group.name = name;
    group.image = image || group.image;
    group.description = description;
    group.participants = validation.participants;
    group.invitedUsers = validation.invited;

    await group.save();
    req.flash('success', 'Gruppo aggiornato con successo!');
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
