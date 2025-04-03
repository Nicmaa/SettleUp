const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

const joiSanitizeExtension = (joi) => ({
  type: 'string',
  base: joi.string(),
  messages: {
    'string.xss': '{{#label}} contiene caratteri non sicuri!'
  },
  rules: {
    xss: {
      validate(value, helpers) {
        const cleanValue = sanitizeHtml(value, {
          allowedTags: [],
          allowedAttributes: {}
        });
        if (cleanValue !== value) {
          return helpers.error('string.xss');
        }
        return cleanValue;
      }
    }
  }
});

const extendedJoi = Joi.extend(joiSanitizeExtension);

module.exports.groupSchema = extendedJoi.object({
  name: extendedJoi.string().min(3).max(50).required().xss(),
  description: extendedJoi.string().max(255).allow(null, '').xss(),
  image: extendedJoi.string().uri().allow(null, ''),
  participants: extendedJoi.array().items(extendedJoi.string().hex().length(24)).default([]),
  invitedEmails: extendedJoi.array().items(extendedJoi.string().email({ minDomainSegments: 2 }).allow('')).default([]),
  invitedNames: extendedJoi.array().items(extendedJoi.string().allow('').xss()).default([]),
  currentInvited: extendedJoi.array(),
  removeInvited: extendedJoi.array(),
}).required();

module.exports.transactionSchema = extendedJoi.object({
  description: extendedJoi.string().max(100).allow(null, '').xss(),
  category: extendedJoi.string().valid('Cibo', 'Trasporti', 'Svago', 'Abbigliamento', 'Lavoro', 'Casa', 'Salute', 'Altro').default('Altro'),
  amounts: extendedJoi.array().items(
    extendedJoi.object({
      user: extendedJoi.string().required(),
      amount: extendedJoi.number().min(0).required(),
      isInvited: extendedJoi.boolean().default(false)
    })
  ).min(1).required()
}).required();

module.exports.userSchema = extendedJoi.object({
  email: Joi.string().email().required(),
  firstName: extendedJoi.string().trim().max(50).allow(null, '').xss(),
  lastName: extendedJoi.string().trim().max(50).allow(null, '').xss(),
  bio: extendedJoi.string().max(150).allow(null, '').xss(),
  avatar: Joi.string().uri().optional().allow(null, '').default('/images/default_avatar.jpg'),
  settings: Joi.object({
    notifications: Joi.object({
      email: Joi.boolean().default(true),
      newTransaction: Joi.boolean().default(true)
    }),
    theme: Joi.string().valid('light', 'dark', 'system').default('system')
  }).optional()
}).required();;
