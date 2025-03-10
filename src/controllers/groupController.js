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

    const validation = validateParticipants(req.body.participants, req.user._id);
    if (!validation.isValid) {
        req.flash('error', validation.message);
        return res.redirect('/groups/new');
    }

    const newGroup = new Group({
        name: req.body.name,
        image: req.body.image || undefined,
        description: req.body.description,
        participants: validation.participants,
        owner: req.user._id,
    });

    await newGroup.save();
    req.flash('success', 'Gruppo creato con successo!');
    res.redirect('/groups');
};

module.exports.renderNewForm = async (req, res) => {
    const users = await User.find({}, 'username _id').sort('username');
    res.render('groups/new', { users });
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

    res.render('groups/show', { group });
};

module.exports.renderEditForm = async (req, res) => {
    const [group, users] = await Promise.all([
        Group.findById(req.params.id).populate('participants', 'username avatar'),
        User.find({}, 'username _id').sort('username')
    ]);

    if (!group) throw new ExpressError("Gruppo non trovato!", 404);
    res.render('groups/edit', { group, users });
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
