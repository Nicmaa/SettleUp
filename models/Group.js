const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    image: { type: String }, // URL immagine gruppo
    //participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    participants: [{ type: String, required: true }], //PER ORA OK
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', groupSchema);
