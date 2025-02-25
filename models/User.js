const mongoose = require('mongoose');
const passport = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  avatar: { type: String }, // URL immagine profilo
  createdAt: { type: Date, default: Date.now }
});

userSchema.plugin(passport);

module.exports = mongoose.model('User', userSchema);
