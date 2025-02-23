const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new mongoose.Schema({
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    description: { type: String },
    amounts: [
        {
            //user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            user: { type: String, required: true }, //PER ORA OK
            amount: { type: Number, required: true, default: 0, min: 0 }
        }
    ],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
