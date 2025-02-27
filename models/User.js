const mongoose = require('mongoose');
const passport = require('passport-local-mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Email mancante'],
    unique: true
  },
  avatar: { type: String, default: '/images/default_avatar.jpg' },
  createdAt: { type: Date, default: Date.now }
});

userSchema.plugin(passport, {
  errorMessages: {
    UserExistsError: 'Utente con username inserito già esistente.',
    MissingPasswordError: 'Password mancante.',
    MissingUsernameError: 'Username mancante.',
    AttemptTooSoonError: 'Account attualmente bloccato. Riprova più tardi.',
    TooManyAttemptsError: 'Account bloccato a causa di troppi tentativi di accesso non riusciti.'
  }
});

module.exports = mongoose.model('User', userSchema);
