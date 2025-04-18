const mongoose = require('mongoose');
const passport = require('passport-local-mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: [true, 'Email mancante'], unique: true, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Formato email non valido'] },
  firstName: { type: String, trim: true, maxlength: [50, 'Il nome deve avere meno di 50 caratteri'] },
  lastName: { type: String, trim: true, maxlength: [50, 'Il cognome deve avere meno di 50 caratteri'] },
  bio: { type: String, maxlength: [150, 'La bio deve avere meno di 150 caratteri'] },
  avatar: { type: String, default: '/images/default_avatar.jpg' },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  settings: {
    notifications: {
      email: {
        newExpense: Boolean,
        paymentReminder: Boolean,
        friendRequest: Boolean,
        groupInvite: Boolean,
      },
      app: {
        newExpense: Boolean,
        paymentReminder: Boolean,
        friendRequest: Boolean,
        groupInvite: Boolean,
      },
    },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' }
  }
}, {
  toJSON: { virtuals: true },
  id: false
});

userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

userSchema.virtual('fullName').get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.username;
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
