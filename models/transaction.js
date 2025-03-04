const mongoose = require('mongoose');
const Group = require('./Group');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    description: { type: String, trim: true, maxlength: [100, 'La descrizione deve avere meno di 100 caratteri'] },
    category: {
        type: String,
        enum: ['Cibo', 'Trasporti', 'Svago', 'Vestiti', 'Lavoro', 'Altro'],
        default: 'Altro'
    },
    amounts: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            amount: { type: Number, required: true, default: 0, min: [0, 'Il prezzo non può essere minore di 0'] }
        }
    ],
    createdAt: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true }
});

transactionSchema.virtual('formattedDate').get(function () {
    return this.createdAt.toLocaleDateString();
});

transactionSchema.statics.refreshBalance = async function (id) {
    const group = await Group.findById(id).populate({
        path: 'transactions',
        populate: { path: 'amounts.user' }
    });

    const { transactionsToSettle } = Group.calculateBalances(group.transactions);
    group.balance = transactionsToSettle;
    await group.save();
};

module.exports = mongoose.model('Transaction', transactionSchema);
