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

groupSchema.virtual('totalSpent').get(function () {
    if (!this.transactions || !this.transactions.length) return 0;

    let total = 0;
    for (let transaction of this.transactions) {
        if (transaction.totalAmount) {
            total += transaction.totalAmount;
        }
    }
    return total;
});

groupSchema.statics.calculateBalances = function (transactions) {
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

    return { transactionsToSettle };
}

module.exports = mongoose.model('Group', groupSchema);
