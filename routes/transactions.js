const express = require('express');
const router = express.Router();

const Transaction = require('../models/Transaction');
const Group = require('../models/Group');

const catchAsync = require('../utilities/catchAsync');
const ExpressError = require('../utilities/expressError');
const { transactionSchema } = require('../joiSchema.js');

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
router.get('/new/:groupId', catchAsync(async (req, res) => {
    const group = await Group.findById(req.params.groupId);
    if (!group) throw new ExpressError("Gruppo non trovato!", 404);
    res.render('transactions/new', { group });
}));

// Creazione nuova transazione
router.post('/new/:groupId', validateTransaction, catchAsync(async (req, res) => {
    const group = await Group.findById(req.params.groupId);
    if (!group) throw new ExpressError("Gruppo non trovato!", 404);

    if (!req.body.amounts || !req.body.amounts.some(a => a.amount > 0)) {
        req.flash('error', 'Almeno un importo deve essere maggiore di 0');
        return res.redirect(`/api/transactions/new/${group._id}`);
    }

    const newTransaction = new Transaction({
        group: group._id,
        amounts: req.body.amounts,
        description: req.body.description
    });

    await newTransaction.save();
    
    group.transactions.push(newTransaction._id);
    await group.save();

    req.flash('success', 'Transazione creata con successo!');
    res.redirect(`/api/groups/${group._id}`);
}));

// Form per modificare una transazione
router.get('/:transId/edit', catchAsync(async (req, res) => {
    const transaction = await Transaction.findById(req.params.transId).populate('group');
    if (!transaction) throw new ExpressError("Transazione non trovata!", 404);
    res.render('transactions/edit', { transaction });
}));

// Modifica una transazione
router.patch('/:groupId/:transId', validateTransaction, catchAsync(async (req, res) => {
    if (!req.body.amounts || !req.body.amounts.some(a => a.amount > 0)) {
        throw new ExpressError("Almeno un importo deve essere maggiore di 0", 400);
    }

    await Transaction.findByIdAndUpdate(req.params.transId, {
        amounts: req.body.amounts,
        description: req.body.description
    });

    req.flash('success', 'Transazione modificata con successo!');
    res.redirect(`/api/groups/${req.params.groupId}`);
}));

// Elimina una transazione
router.delete('/:groupId/:transId', catchAsync(async (req, res) => {
    const { groupId, transId } = req.params;
    await Transaction.findByIdAndDelete(transId);

    await Group.findByIdAndUpdate(groupId, {
        $pull: { transactions: transId }
    });

    req.flash('success', 'Transazione eliminata con successo!');
    res.redirect(`/api/groups/${groupId}`);
}));

module.exports = router;
