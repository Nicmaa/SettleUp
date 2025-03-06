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

const validateParticipants = (participants, userId) => {
    // Controllo numero minimo partecipanti
    if (!participants || participants.length < 2) {
        return { isValid: false, message: 'Devono essere presenti almeno 2 partecipanti!' };
    }
    
    // Controllo presenza del proprietario nei partecipanti
    const participantsArray = Array.isArray(participants) ? [...participants] : [participants];
    const hasOwner = participantsArray.includes(userId.toString());
    
    // Controllo duplicati
    const participantsSet = new Set(participantsArray);
    if (participantsSet.size !== participantsArray.length) {
        return { isValid: false, message: 'Hai inserito lo stesso partecipante più volte!' };
    }
    
    return { 
        isValid: true, 
        participants: hasOwner ? participantsArray : [...participantsArray, userId.toString()]
    };
};

//Tutti i gruppi dell'utente connesso
router.get('/', isLoggedIn, catchAsync(async (req, res) => {
    const groups = await Group.find({ participants: req.user._id })
        .populate('participants', 'username avatar')
        .populate('transactions')
        .sort({ updatedAt: -1 });

    res.render('groups/index', { groups });
}));

//Form per creare un nuovo gruppo
router.get('/new', isLoggedIn, catchAsync(async (req, res) => {
    const users = await User.find({}, 'username _id').sort('username');
    res.render('groups/new', { users });
}));

//Creazione nuovo gruppo
router.post('/new', isLoggedIn, validateGroup, catchAsync(async (req, res) => {
    
    const validation = validateParticipants(req.body.participants, req.user._id);
    if (!validation.isValid) {
        req.flash('error', validation.message);
        return res.redirect('/api/groups/new');
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
            ]
        });

    if (!group) throw new ExpressError("Gruppo non trovato!", 404);

    res.render('groups/show', { group });
}));

// Form per modificare un gruppo
router.get('/:id/edit', isLoggedIn, isGroupOwner, catchAsync(async (req, res) => {
    const [group, users] = await Promise.all([
        Group.findById(req.params.id).populate('participants', 'username avatar'),
        User.find({}, 'username _id').sort('username')
    ]);
    
    if (!group) throw new ExpressError("Gruppo non trovato!", 404);
    res.render('groups/edit', { group, users });
}));

// Modifica del gruppo
router.put('/:id', isLoggedIn, isGroupOwner, validateGroup, catchAsync(async (req, res) => {
    
    const validation = validateParticipants(req.body.participants, req.user._id);
    if (!validation.isValid) {
        req.flash('error', validation.message);
        return res.redirect(`/api/groups/${req.params.id}/edit`);
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
    res.redirect(`/api/groups/${group._id}`);
}));

// Elimina un gruppo e tutte le sue transazioni
router.delete('/:id', isLoggedIn, isGroupOwner, catchAsync(async (req, res) => {
    const group = await Group.findById(req.params.id);
    if (!group) throw new ExpressError("Gruppo non trovato!", 404);

    await Promise.all([
        Transaction.deleteMany({ group: group._id }),
        Group.findByIdAndDelete(req.params.id)
    ]);

    req.flash('success', 'Gruppo eliminato con successo!');
    res.redirect('/api/groups');
}));

module.exports = router;
