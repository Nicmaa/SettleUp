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
    invitedUsers: [{ email: String, name: String }],
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
    return this.participants.length + this.invitedUsers.length;
});

groupSchema.virtual('totalSpent').get(function () {
    return this.transactions.reduce((sum, transaction) => sum + transaction.amounts.reduce((s, p) => s + p.amount, 0), 0);
});

groupSchema.methods.currentUserBalance = function (currentUser) {
    const username = currentUser.username;
    
    const userTransactions = this.balance.filter(entry => 
        entry.from === username || entry.to === username
    );
    
    const totalAmount = userTransactions.reduce((sum, entry) => {
        if (entry.from === username) {
            return sum - parseFloat(entry.amount);
        } else if (entry.to === username) {
            return sum + parseFloat(entry.amount);
        }
        return sum;
    }, 0);

    return parseFloat(totalAmount.toFixed(2));
};

groupSchema.statics.calculateBalances = function (transactions) {
    if (!transactions || !Array.isArray(transactions)) {
        return { transactionsToSettle: [] };
    }

    transactions = transactions.filter(t => 
        t.amounts && 
        Array.isArray(t.amounts) && 
        t.amounts.length > 0 && 
        t.amounts.every(a => a.user !== undefined && a.amount !== undefined)
    );

    if (transactions.length === 0) {
        return { transactionsToSettle: [] };
    }

    let balances = transactions.reduce((acc, t) => {
        t.amounts.forEach(({ user, amount }) => {
            const username = typeof user === 'string' ? user : 
                             (user.username ? user.username : user.toString());
            
            acc[username] = (acc[username] || 0) + amount;
        });
        return acc;
    }, {});

    const total = Object.values(balances).reduce((sum, amount) => sum + amount, 0);
    const userCount = Object.keys(balances).length;
    const perPerson = total / userCount;

    let debts = Object.entries(balances).map(([username, amount]) => {
        return {
            username,
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
            from: debtor.username,
            to: creditor.username,
            amount: amountToPay.toFixed(2)
        });

        debtor.balance += amountToPay;
        creditor.balance -= amountToPay;

        if (Math.abs(debtor.balance) < 0.01) i++;
        if (Math.abs(creditor.balance) < 0.01) j++;
    }

    return { transactionsToSettle };
}

groupSchema.methods.topSpender = async function () {
    if (!this.transactions || this.transactions.length === 0) {
        return {
            username: "Nessuno",
            amount: 0,
        };
    }

    const transactions = await mongoose.model('Transaction').find({ _id: { $in: this.transactions } });

    let spending = {};

    transactions.forEach(transaction => {
        transaction.amounts.forEach(({ user, amount }) => {
            const username = user;
            spending[username] = (spending[username] || 0) + amount;
        });
    });

    if (Object.keys(spending).length === 0) {
        return null;
    }

    const topUsername = Object.keys(spending).reduce((a, b) => spending[a] > spending[b] ? a : b);
    const topAmount = spending[topUsername];

    return {
        username: topUsername,
        amount: topAmount
    };
};

module.exports = mongoose.model('Group', groupSchema);
