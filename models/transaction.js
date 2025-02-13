const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    group: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    payments: [
        {
            name: {
                type: String,
                required: true,
                trim: true
            },
            amount: {
                type: Number,
                required: true,
                min: 0
            }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
