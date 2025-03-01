const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Nome del gruppo mancante.'],
        unique: true,
        trim: true,
        minlength: [3, 'Il nome del gruppo deve essere di almeno 3 caratteri'],
        maxlength: [50, 'Il nome del gruppo deve avere meno di 50 caratteri'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Il nome del gruppo deve avere meno di 500 caratteri'],
    },
    image: { type: String, default: '/images/default_group.jpg' },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
    createdAt: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true }
});

groupSchema.virtual('transactionCount').get(function () {
    return this.transactions.length;
});

groupSchema.virtual('participantsCount').get(function () {
    return this.participants.length;
});

groupSchema.virtual('totalSpent').get(async function () {
    await this.populate('transactions');
    return this.transactions.reduce((sum, transaction) => sum + transaction.amounts.reduce((s, p) => s + p.amount, 0), 0);
});

groupSchema.statics.calculateBalances = function (transactions) {
    let balances = transactions.reduce((acc, t) => {
        t.amounts.forEach(({ user, amount }) => {
            acc[user] = (acc[user] || 0) + amount;
        });
        return acc;
    }, {});

    let total = Object.values(balances).reduce((sum, amount) => sum + amount, 0);
    let perPerson = total / Object.keys(balances).length;

    let debts = Object.entries(balances).map(([user, amount]) => ({
        user,
        balance: amount - perPerson
    }));

    let creditors = debts.filter(d => d.balance > 0).sort((a, b) => b.balance - a.balance);
    let debtors = debts.filter(d => d.balance < 0).sort((a, b) => a.balance - b.balance);

    let transactionsToSettle = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];
        let amountToPay = Math.min(-debtor.balance, creditor.balance);

        transactionsToSettle.push({ from: debtor.user, to: creditor.user, amount: amountToPay.toFixed(2) });

        debtor.balance += amountToPay;
        creditor.balance -= amountToPay;

        if (debtor.balance === 0) i++;
        if (creditor.balance === 0) j++;
    }

    return { transactionsToSettle };
};


module.exports = mongoose.model('Group', groupSchema);
