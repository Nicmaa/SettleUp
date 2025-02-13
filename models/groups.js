const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const participantSchema = new Schema({
    name: {
        type: String,
        required: true,
    }
}, { _id: false });

const groupSchema = new Schema({
    title: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        maxLength: 100,
        trim: true
    },
    partecipants: {
        type: [participantSchema],
        required: true
    },
    transactions: [{
        type: Schema.Types.ObjectId,
        ref: 'Transaction'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
