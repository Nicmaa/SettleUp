const express = require('express');
const router = express.Router();

const Group = require('../models/Group');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const catchAsync = require('../utilities/catchAsync');
const ExpressError = require('../utilities/expressError');
const { groupSchema } = require('../joiSchema.js');
const { isLoggedIn, isGroupOwnerOrParticipant, isGroupOwner } = require('../middleware.js');

const validateGroup = (req, res, next) => {
    const { error } = groupSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else {
        next();
    }
};

//Tutti i gruppi dell'utente connesso
router.get('/', isLoggedIn, catchAsync(async (req, res) => {
    const groups = await Group.find({ participants: req.user._id })
        .populate('participants', 'username avatar')
        .sort({ updatedAt: -1 });

    for (let group of groups) {
        await group.populate('transactions');
    }

    res.render('groups/index', { groups });
}));

//Form per creare un nuovo gruppo
router.get('/new', isLoggedIn, catchAsync(async (req, res) => {
    const users = await User.find({}).select('username _id');
    res.render('groups/new', { users });
}));

//Creazione nuovo gruppo
router.post('/new', isLoggedIn, validateGroup, catchAsync(async (req, res) => {
    if (!req.body.participants || req.body.participants.length < 2) {
        req.flash('error', 'Devono essere presenti almeno 2 partecipanti!');
        return res.redirect('/api/groups/new');
    }

    //Controllo che creatore sia nei partecipanti
    if (!req.body.participants.includes(req.user._id.toString())) {
        req.body.participants.push(req.user._id);
    }

    //Controllo duplicati
    const participantsSet = new Set(req.body.participants);
    if (participantsSet.size !== req.body.participants.length) {
        req.flash('error', 'Hai inserito lo stesso partecipante più volte!');
        return res.redirect('/api/groups/new');
    }

    const newGroup = new Group({
        name: req.body.name,
        image: req.body.image || undefined,
        description: req.body.description,
        participants: req.body.participants,
        owner: req.user._id,
    });

    await newGroup.save();
    req.flash('success', 'Gruppo creato con successo!');
    res.redirect('/api/groups');
}));

// Mostra un gruppo specifico
router.get('/:id', isLoggedIn, isGroupOwnerOrParticipant, catchAsync(async (req, res) => {
    const group = await Group.findById(req.params.id)
        .populate('participants', 'username avatar')
        .populate('owner', 'username')
        .populate({
            path: 'transactions',
            options: { sort: { createdAt: -1 } },
            populate: [
                { path: 'amounts.user', select: 'username' },
                { path: 'createdAt' }
            ]
        });

    if (!group) throw new ExpressError("Gruppo non trovato!", 404);

    res.render('groups/show', { group });
}));

// Form per modificare un gruppo
router.get('/:id/edit', isLoggedIn, isGroupOwner, catchAsync(async (req, res) => {
    const group = await Group.findById(req.params.id).populate('participants', 'username avatar');
    if (!group) throw new ExpressError("Gruppo non trovato!", 404);

    const users = await User.find({}).select('username _id');
    res.render('groups/edit', { group, users });
}));

// Modifica del gruppo
router.put('/:id', isLoggedIn, isGroupOwner, validateGroup, catchAsync(async (req, res) => {
    if (!req.body.participants || req.body.participants.length < 2) {
        req.flash('error', 'Devono essere presenti almeno 2 partecipanti!');
        return res.redirect(`/api/groups/${req.params.id}/edit`);
    }

    //Controllo che creatore sia nei partecipanti
    if (!req.body.participants.includes(req.user._id.toString())) {
        req.body.participants.push(req.user._id);
    }

    //Controllo duplicati
    const participantsSet = new Set(req.body.participants);
    if (participantsSet.size !== req.body.participants.length) {
        req.flash('error', 'Hai inserito lo stesso partecipante più volte!');
        return res.redirect('/api/groups/new');
    }

    const { name, image, description, participants } = req.body;
    const group = await Group.findByIdAndUpdate(
        req.params.id,
        { name, image, description, participants },
        { new: true, runValidators: true },
    );
    if (!group) throw new ExpressError("Gruppo non trovato!", 404);

    req.flash('success', 'Gruppo modificato con successo!');
    res.redirect(`/api/groups/${group._id}`);
}));

// Elimina un gruppo e tutte le sue transazioni
router.delete('/:id', isLoggedIn, isGroupOwner, catchAsync(async (req, res) => {
    const group = await Group.findById(req.params.id);
    if (!group) throw new ExpressError("Group not found", 404);

    await Transaction.deleteMany({ group: group._id });
    await Group.findByIdAndDelete(req.params.id);

    req.flash('success', 'Gruppo eliminato con successo!');
    res.redirect('/api/groups');
}));

module.exports = router;
