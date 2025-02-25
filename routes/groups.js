const express = require('express');
const router = express.Router();

const Group = require('../models/Group');
const Transaction = require('../models/Transaction');

const catchAsync = require('../utilities/catchAsync');
const ExpressError = require('../utilities/expressError');
const { groupSchema } = require('../joiSchema.js');
const { isLoggedIn } = require('../middleware.js');

const validateGroup = (req, res, next) => {
    if (typeof req.body.participants === 'string') {
        req.body.participants = [req.body.participants];
    }

    const { error } = groupSchema.validate(req.body);

    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else {
        next();
    }
};

//Tutti i gruppi
router.get('/', catchAsync(async (req, res) => {
    const groups = await Group.find({});
    res.render('groups/index', { groups });
}));

//Form per creare un nuovo gruppo
router.get('/new', isLoggedIn, (req, res) => {
    res.render('groups/new');
});

//Creazione nuovo gruppo
router.post('/new', isLoggedIn, validateGroup, catchAsync(async (req, res) => {
    if (!req.body.participants || req.body.participants.length < 2) {
        req.flash('error','Devono essere presenti almeno 2 partecipanti!');
        return res.redirect('/api/groups/new');
    }

    const newGroup = new Group({
        name: req.body.name,
        image: req.body.image,
        description: req.body.description,
        participants: req.body.participants
    });

    await newGroup.save();
    req.flash('success','Gruppo creato con successo!');
    res.redirect('/api/groups');
}));

// Mostra un gruppo specifico
router.get('/:id', catchAsync(async (req, res) => {
    const group = await Group.findById(req.params.id).populate('transactions');
    if (!group) throw new ExpressError("Gruppo non trovato!", 404);
    const transactions = await Transaction.find({ _id: { $in: group.transactions } }).sort({ createdAt: -1 });

    // Aggrega i pagamenti per persona
    let paymentMap = new Map();

    transactions.forEach(transaction => {
        transaction.amounts.forEach(payment => {
            if (paymentMap.has(payment.user)) {
                paymentMap.set(payment.user, paymentMap.get(payment.user) + payment.amount);
            } else {
                paymentMap.set(payment.user, payment.amount);
            }
        });
    });

    // Converte la mappa in un array
    let payments = Array.from(paymentMap, ([user, amount]) => ({ user, amount }));

    // Calcola il totale e la quota per persona
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    const perPerson = total / payments.length;

    // Calcola il bilancio di ciascuno
    let balances = payments.map(p => ({
        user: p.user,
        balance: p.amount - perPerson
    }));

    // Separa creditori (+) e debitori (-)
    let creditors = balances.filter(p => p.balance > 0).sort((a, b) => b.balance - a.balance);
    let debtors = balances.filter(p => p.balance < 0).sort((a, b) => a.balance - b.balance);

    // Lista delle transazioni per bilanciare
    let transactionsToSettle = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];

        let amountToPay = Math.min(-debtor.balance, creditor.balance);

        transactionsToSettle.push({
            from: debtor.user,
            to: creditor.user,
            amount: amountToPay.toFixed(2)
        });

        // Aggiorna i bilanci
        debtor.balance += amountToPay;
        creditor.balance -= amountToPay;

        // Se qualcuno ha saldo 0, passa al successivo
        if (debtor.balance === 0) i++;
        if (creditor.balance === 0) j++;
    }
    res.render('groups/show', { group, total, transactionsToSettle, transactions });
}));

// Form per modificare un gruppo
router.get('/:id/edit', catchAsync(async (req, res) => {
    const group = await Group.findById(req.params.id);
    if (!group) throw new ExpressError("Gruppo non trovato!", 404);
    res.render('groups/edit', { group });
}));

// Modifica del gruppo
router.put('/:id', validateGroup, catchAsync(async (req, res) => {
    const { name, image, description, participants } = req.body;
    const group = await Group.findByIdAndUpdate(req.params.id, { name, image, description, participants }, { new: true });
    if (!group) throw new ExpressError("Gruppo non trovato!", 404);

    req.flash('success', 'Gruppo modificato con successo!');
    res.redirect(`/api/groups`);
}));

// Elimina un gruppo e tutte le sue transazioni
router.delete('/:id', catchAsync(async (req, res) => {
    const group = await Group.findById(req.params.id);
    if (!group) throw new ExpressError("Group not found", 404);

    await Transaction.deleteMany({ _id: { $in: group.transactions } });
    await Group.findByIdAndDelete(req.params.id);

    req.flash('success', 'Gruppo eliminato con successo!');
    res.redirect('/api/groups');
}));

module.exports = router;
