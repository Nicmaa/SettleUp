const Transaction = require('../models/Transaction');
const Group = require('../models/Group');
const ExpressError = require('../utilities/expressError');

const categoryEmojis = {
    "Cibo": "🍕",
    "Trasporti": "🚌",
    "Svago": "🎮",
    "Lavoro": "⚒️",
    "Abbigliamento": "👕",
    "Casa": "🏠",
    "Salute": "🩺",
    "Altro": "🔍"
};

module.exports.renderNewForm = async (req, res) => {
    const group = await Group.findById(req.params.id)
        .populate('participants', 'username');

    if (!group) throw new ExpressError("Gruppo non trovato!", 404);

    const categories = Transaction.schema.path('category').enumValues;
    res.render('transactions/new', { group, categories });
};

module.exports.createTransaction = async (req, res) => {
    const group = await Group.findById(req.params.id);
    if (!group) throw new ExpressError("Gruppo non trovato!", 404);

    const { category, description, amounts } = req.body;

    const newTransaction = new Transaction({
        group: group._id,
        amounts,
        description,
        category,
        categoryEmoji: categoryEmojis[category]
    });

    await newTransaction.save();
    group.transactions.push(newTransaction._id);
    await group.save();
    await Transaction.refreshBalance(group._id);

    req.flash('success', 'Transazione creata con successo!');
    res.redirect(`/groups/${group._id}`);
};

module.exports.renderEditForm = async (req, res) => {
    const transaction = await Transaction.findById(req.params.id)
        .populate('group')
        .populate('amounts.user');

    if (!transaction) throw new ExpressError("Transazione non trovata!", 404);

    const group = await Group.findById(transaction.group._id)
        .populate('participants', 'username');

    const categories = Transaction.schema.path('category').enumValues;
    res.render('transactions/edit', { transaction, group, categories });
};

module.exports.editTransaction = async (req, res) => {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) throw new ExpressError("Transazione non trovata!", 404);

    const { category, description, amounts } = req.body;

    transaction.amounts = amounts;
    transaction.description = description;
    transaction.category = category;
    transaction.categoryEmoji = categoryEmojis[category];

    await transaction.save();
    await Transaction.refreshBalance(transaction.group);

    req.flash('success', 'Transazione modificata con successo!');
    res.redirect(`/groups/${transaction.group}`);
};

module.exports.deleteTransaction = async (req, res) => {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) throw new ExpressError("Transazione non trovata!", 404);

    await Group.findByIdAndUpdate(transaction.group, {
        $pull: { transactions: transaction._id }
    });

    await Transaction.findByIdAndDelete(req.params.id);

    await Transaction.refreshBalance(transaction.group);

    req.flash('success', 'Transazione eliminata con successo!');
    res.redirect(`/groups/${transaction.group}`);
};
