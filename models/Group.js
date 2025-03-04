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
    balance: [{ from: String, to: String, amount: Number }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    id: false
});

groupSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

groupSchema.virtual('transactionCount').get(function () {
    return this.transactions.length;
});

groupSchema.virtual('participantsCount').get(function () {
    return this.participants.length;
});

groupSchema.virtual('totalSpent').get(function () {
    return this.transactions.reduce((sum, transaction) => sum + transaction.amounts.reduce((s, p) => s + p.amount, 0), 0);
});

groupSchema.methods.addParticipant = function (userId) {
    if (!this.participants.includes(userId)) {
        this.participants.push(userId);
    }
    return this;
};

groupSchema.methods.removeParticipant = function (userId) {
    this.participants = this.participants.filter(id => id.toString() !== userId.toString());
    return this;
};

groupSchema.statics.calculateBalances = function (transactions) {

    if (!transactions || !Array.isArray(transactions)) {
        console.error('Transactions is not a valid array');
        return { transactionsToSettle: [] };
    }

    transactions = transactions.map(t => {
        if (t.populated && typeof t.populated === 'function') {
            return t;
        }
        return t.populate ? t.populate('amounts.user') : t;
    });

    transactions = transactions.filter(t => {
        const hasValidAmounts = t.amounts && 
            Array.isArray(t.amounts) && 
            t.amounts.length > 0 && 
            t.amounts.every(a => a.user && a.amount !== undefined);
        
        if (!hasValidAmounts) {
            console.warn('Transaction missing valid amounts:', t);
        }
        return hasValidAmounts;
    });

    if (transactions.length === 0) {
        console.error('No valid transactions found');
        return { transactionsToSettle: [] };
    }

    let balances = transactions.reduce((acc, t) => {
        t.amounts.forEach(({ user, amount }) => {
            // Ensure we have a valid user ID
            const userId = user._id ? user._id.toString() : user.toString();
            acc[userId] = (acc[userId] || 0) + amount;
        });
        return acc;
    }, {});

    if (Object.keys(balances).length === 0) {
        console.error('No balances calculated');
        return { transactionsToSettle: [] };
    }

    let total = Object.values(balances).reduce((sum, amount) => sum + amount, 0);
    let perPerson = total / Object.keys(balances).length;

    let debts = Object.entries(balances).map(([userId, amount]) => {
        let userObj = transactions
            .flatMap(t => t.amounts)
            .find(a => {
                const matchId = a.user._id ? a.user._id.toString() === userId : a.user.toString() === userId;
                return matchId;
            })?.user;

        return {
            user: userObj,
            balance: amount - perPerson
        };
    });

    let creditors = debts.filter(d => d.balance > 0).sort((a, b) => b.balance - a.balance);
    let debtors = debts.filter(d => d.balance < 0).sort((a, b) => a.balance - b.balance);

    let transactionsToSettle = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];
        let amountToPay = Math.min(-debtor.balance, creditor.balance);

        transactionsToSettle.push({ 
            from: debtor.user.username || debtor.user._id.toString(), 
            to: creditor.user.username || creditor.user._id.toString(), 
            amount: amountToPay.toFixed(2) 
        });

        debtor.balance += amountToPay;
        creditor.balance -= amountToPay;

        if (debtor.balance === 0) i++;
        if (creditor.balance === 0) j++;
    }

    return { transactionsToSettle };
};

module.exports = mongoose.model('Group', groupSchema);
