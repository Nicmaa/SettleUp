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
    name: extendedJoi.string().min(3).max(50).required(),
    description: extendedJoi.string().max(255).allow(null, ''),
    image: extendedJoi.string().uri().allow(null, '').default('/images/default_group.jpg'),
    owner: extendedJoi.string().hex().length(24),
    participants: extendedJoi.array().items(extendedJoi.string().hex().length(24)),
    transactions: extendedJoi.array().items(extendedJoi.string().hex().length(24)),
    balance: extendedJoi.array().items(extendedJoi.object({ from: extendedJoi.string(), to: extendedJoi.string(), amount: extendedJoi.number() })),
    invitedEmails: extendedJoi.array().items(extendedJoi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }).allow('')),
    invitedNames: extendedJoi.array().items(extendedJoi.string().allow('')),
    createdAt: Joi.date().default(Date.now),
    updatedAt: Joi.date().default(Date.now)
}).required();

module.exports.transactionSchema = extendedJoi.object({
    description: extendedJoi.string().max(100).allow(null, ''),
    category: extendedJoi.string(),
    amounts: extendedJoi.array().items(
        extendedJoi.object({
            user: extendedJoi.alternatives().try(
                extendedJoi.string(),
                extendedJoi.object()
            ).required(),
            amount: extendedJoi.number().min(0).required(),
            isInvited: extendedJoi.boolean().default(false)
        })
    ).min(1).required()
}).required();
