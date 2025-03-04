const express = require('express');
const router = express.Router();

const Transaction = require('../models/Transaction');
const Group = require('../models/Group');

const catchAsync = require('../utilities/catchAsync');
const ExpressError = require('../utilities/expressError');
const { transactionSchema } = require('../joiSchema.js');
const { isLoggedIn, isGroupOwnerOrParticipant, isTransactionCreator } = require('../middleware.js');

const validateTransaction = (req, res, next) => {
    if (!req.body.user || !req.body.amount) {
        throw new ExpressError("Dati della transazione mancanti", 400);
    }

    const transformedData = {
        description: req.body.description || '',
        amounts: req.body.user.map((user, index) => ({
            user,
            amount: parseFloat(req.body.amount[index]) || 0
        }))
    };

    const { error } = transactionSchema.validate(transformedData);

    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else {
        req.body = transformedData;
        next();
    }
};

// Form per aggiungere una nuova transazione
router.get('/new/:id', isLoggedIn, isGroupOwnerOrParticipant, catchAsync(async (req, res) => {
    const group = await Group.findById(req.params.id)
        .populate('participants', 'username');
    if (!group) throw new ExpressError("Gruppo non trovato!", 404);
    const categories = Transaction.schema.path('category').enumValues;
    res.render('transactions/new', { group, categories });
}));

// Creazione nuova transazione
router.post('/new/:id', isLoggedIn, isGroupOwnerOrParticipant, validateTransaction, catchAsync(async (req, res) => {
    const group = await Group.findById(req.params.id).populate({
        path: 'transactions',
        populate: { path: 'amounts.user' }
    });
    if (!group) throw new ExpressError("Gruppo non trovato!", 404);

    if (!req.body.amounts || !req.body.amounts.some(a => a.amount > 0)) {
        req.flash('error', 'Almeno un importo deve essere maggiore di 0');
        return res.redirect(`/api/transactions/new/${group._id}`);
    }

    const newTransaction = new Transaction({
        group: group._id,
        amounts: req.body.amounts,
        description: req.body.description,
        category: req.body.categories,
    });

    await newTransaction.save();

    group.transactions.push(newTransaction._id);
    await group.save();
    Transaction.refreshBalance(group._id);

    req.flash('success', 'Transazione creata con successo!');
    res.redirect(`/api/groups/${group._id}`);
}));

// Form per modificare una transazione
router.get('/:id/edit', isLoggedIn, catchAsync(async (req, res) => {
    const transaction = await Transaction.findById(req.params.id)
    .populate('group')
    .populate('amounts.user');
    if (!transaction) throw new ExpressError("Transazione non trovata!", 404);
    const group = await Group.findById(transaction.group._id)
        .populate('participants', 'username');
    const categories = Transaction.schema.path('category').enumValues;
    res.render('transactions/edit', { transaction, group, categories });
}));

// Modifica una transazione
router.patch('/:id', isLoggedIn, validateTransaction, catchAsync(async (req, res) => {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) throw new ExpressError("Transazione non trovata!", 404);
    if (!req.body.amounts || !req.body.amounts.some(a => a.amount > 0)) {
        throw new ExpressError("Almeno un importo deve essere maggiore di 0", 400);
    }

    transaction.amounts = req.body.amounts;
    transaction.description = req.body.description;
    transaction.category = req.body.categories;
    await transaction.save();

    Transaction.refreshBalance(transaction.group);
    
    req.flash('success', 'Transazione modificata con successo!');
    res.redirect(`/api/groups/${transaction.group}`);
}));

// Elimina una transazione
router.delete('/:id', isLoggedIn, catchAsync(async (req, res) => {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) throw new ExpressError("Transazione non trovata!", 404);

    await Group.findByIdAndUpdate(transaction.group, {
        $pull: { transactions: transaction._id }
    });

    await Transaction.findByIdAndDelete(req.params.id);

    Transaction.refreshBalance(transaction.group);

    req.flash('success', 'Transazione eliminata con successo!');
    res.redirect(`/api/groups/${transaction.group}`);
}));

module.exports = router;
