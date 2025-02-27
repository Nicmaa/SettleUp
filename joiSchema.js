const Joi = require('joi');

module.exports.groupSchema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().max(255).allow(null, ''),
    image: Joi.string().uri().allow(null, ''),
    participants: Joi.array().items(Joi.string().required()).min(1).required(),
    transactions: Joi.array().items(Joi.string().hex().length(24)),
    createdAt: Joi.date().default(Date.now)
}).required();

module.exports.transactionSchema = Joi.object({
    description: Joi.string().max(100).allow(null, ''),
    amounts: Joi.array().items(
        Joi.object({
            user: Joi.string().required(), // PER ORA STRINGA, poi ObjectId
            amount: Joi.number().precision(2).required()
        })
    ).min(1).required(),
    createdAt: Joi.date().default(Date.now),
}).required();
