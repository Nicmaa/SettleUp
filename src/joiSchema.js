const Joi = require('joi');

module.exports.groupSchema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().max(255).allow(null, ''),
    image: Joi.string().uri().allow(null, '').default('/images/default_group.jpg'),
    owner: Joi.string().hex().length(24),
    participants: Joi.array().items(Joi.string().hex().length(24)),
    transactions: Joi.array().items(Joi.string().hex().length(24)),
    balance: Joi.array().items(Joi.object({ from: Joi.string(), to: Joi.string(), amount: Joi.number() })),
    invitedEmails: Joi.array().items(Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }).allow('')),
    invitedNames: Joi.array().items(Joi.string().allow('')),
    createdAt: Joi.date().default(Date.now),
    updatedAt: Joi.date().default(Date.now)
}).required();

module.exports.transactionSchema = Joi.object({
    description: Joi.string().max(100).allow(null, ''),
    category: Joi.string(),
    amounts: Joi.array().items(
        Joi.object({
            user: Joi.alternatives().try(
                Joi.string(),
                Joi.object()
            ).required(),
            amount: Joi.number().min(0).required(),
            isInvited: Joi.boolean().default(false)
        })
    ).min(1).required()
}).required();
