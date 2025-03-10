const mongoose = require('mongoose');
const Group = require('./Group');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    description: { type: String, trim: true, maxlength: [100, 'La descrizione deve avere meno di 100 caratteri'] },
    category: {
        type: String,
        enum: ['Cibo', 'Trasporti', 'Svago', 'Vestiti', 'Lavoro', 'Casa', 'Salute', 'Altro'],
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
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return this.createdAt.toLocaleDateString('it-IT', options);
});

transactionSchema.statics.refreshBalance = async function (groupId) {
    try {
        const Group = mongoose.model('Group');
        
        const group = await Group.findById(groupId).populate({
            path: 'transactions',
            populate: { path: 'amounts.user' }
        });
        
        if (!group) throw new ExpressError(`Gruppo con ID ${groupId} non trovato`,404);
        
        const { transactionsToSettle } = Group.calculateBalances(group.transactions);
        group.balance = transactionsToSettle;
        
        await group.save();
        return group;
    } catch (error) {
        console.error('Errore durante il refresh del bilancio:', error);
        throw new ExpressError(`Errore nel refresh dei bilanci. Riprovare.`,error.status || 500);
    }
};

module.exports = mongoose.model('Transaction', transactionSchema);
