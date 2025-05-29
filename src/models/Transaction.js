const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    description: { type: String, trim: true, maxlength: [100, 'La descrizione deve avere meno di 100 caratteri'] },
    category: {
        type: String,
        enum: ['Cibo', 'Trasporti', 'Svago', 'Abbigliamento', 'Lavoro', 'Casa', 'Salute', 'Altro'],
        default: 'Altro'
    },
    categoryEmoji: { type: String, default: '🔍' },
    amounts: [
        {
            user: { type: String, required: true },
            amount: { type: Number, required: true, default: 0, min: [0, 'Il prezzo non può essere minore di 0'] },
            isInvited: { type: Boolean, default: false }
        }
    ],
    exemptions: [String],
    isDebt: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true }
});

transactionSchema.virtual('formattedDate').get(function () {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return this.createdAt.toLocaleDateString('it-IT', options);
});

transactionSchema.virtual('totalAmount').get(function () {
    return this.amounts.reduce((sum, item) => sum + item.amount, 0);
});

module.exports = mongoose.model('Transaction', transactionSchema);
