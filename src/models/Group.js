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
        maxlength: [500, 'La descrizione deve avere meno di 500 caratteri'],
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
    return this.transactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0);
});

groupSchema.statics.calculateBalances = async function (groupId) {
    const group = await this.findById(groupId).populate('transactions');
    if (!group) throw new Error(`Gruppo con ID ${groupId} non trovato`);

    const transactions = group.transactions;

    if (!transactions || transactions.length === 0) {
        return { transactionsToSettle: [] };
    }

    // Filtra transazioni valide
    const validTransactions = transactions.filter(t =>
        t.amounts &&
        Array.isArray(t.amounts) &&
        t.amounts.length > 0 &&
        t.amounts.every(a => a.user !== undefined && a.amount !== undefined)
    );

    // Raccogli tutti i partecipanti
    const allParticipants = new Set();
    validTransactions.forEach(t => {
        t.amounts.forEach(({ user }) => {
            const username = typeof user === 'string' ? user :
                (user.username ? user.username : user.toString());
            allParticipants.add(username);
        });
    });

    // Inizializza i bilanci
    const balances = {};
    allParticipants.forEach(user => {
        balances[user] = 0;
    });

    // Processa ogni transazione (spesa condivisa)
    validTransactions.forEach(transaction => {
        const exemptedUsers = Array.isArray(transaction.exemptions) ? transaction.exemptions : [];

        const totalAmount = transaction.totalAmount;

        const eligibleParticipants = Array.from(allParticipants).filter(user =>
            !exemptedUsers.includes(user)
        );

        if (eligibleParticipants.length === 0) {
            transaction.amounts.forEach(({ user, amount }) => {
                const username = typeof user === 'string' ? user :
                    (user.username ? user.username : user.toString());
                balances[username] += amount;
            });
            return;
        }

        const sharePerPerson = totalAmount / eligibleParticipants.length;

        allParticipants.forEach(user => {
            const amountPaid = transaction.amounts.find(a => {
                const username = typeof a.user === 'string' ? a.user :
                    (a.user.username ? a.user.username : a.user.toString());
                return username === user;
            })?.amount || 0;

            if (eligibleParticipants.includes(user)) {
                balances[user] += amountPaid - sharePerPerson;
            } else {
                balances[user] += amountPaid;
            }
        });
    });

    const creditors = [];
    const debtors = [];

    Object.entries(balances).forEach(([user, balance]) => {
        if (balance > 0.01) {
            creditors.push({ username: user, balance: balance });
        } else if (balance < -0.01) {
            debtors.push({ username: user, balance: Math.abs(balance) });
        }
    });

    const transactionsToSettle = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        const amountToPay = Math.min(debtor.balance, creditor.balance);

        transactionsToSettle.push({
            from: debtor.username,
            to: creditor.username,
            amount: parseFloat(amountToPay.toFixed(2))
        });

        debtor.balance -= amountToPay;
        creditor.balance -= amountToPay;

        if (debtor.balance < 0.01) i++;
        if (creditor.balance < 0.01) j++;
    }

    return {
        transactionsToSettle,
        individualBalances: balances
    };
};

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

groupSchema.statics.refreshBalance = async function (groupId) {
    const group = await this.findById(groupId).populate('transactions');
    if (!group) throw new Error(`Gruppo con ID ${groupId} non trovato`);

    const { transactionsToSettle } = await this.calculateBalances(groupId);
    group.balance = transactionsToSettle;
    await group.save();

    return group;
};


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
