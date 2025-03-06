const Joi = require('joi');

module.exports.groupSchema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().max(255).allow(null, ''),
    image: Joi.string().uri().allow(null, '').default('/images/default_group.jpg'),
    owner: Joi.string().hex().length(24),
    participants: Joi.array().items(Joi.string().hex().length(24).required()).min(1).required(),
    transactions: Joi.array().items(Joi.string().hex().length(24)),
    balance: Joi.array().items(Joi.object({ from: Joi.string(), to: Joi.string(), amount: Joi.number() })),
    createdAt: Joi.date().default(Date.now),
    updatedAt: Joi.date().default(Date.now)
}).required();

module.exports.transactionSchema = Joi.object({
    description: Joi.string().max(100).allow(null, ''),
    category: Joi.string(),
    amounts: Joi.array().items(
        Joi.object({
            user: Joi.string().hex().length(24).required(),
            amount: Joi.number().precision(2).required().min(0)
        })
    ).min(1).required(),
    createdAt: Joi.date().default(Date.now),
}).required();
