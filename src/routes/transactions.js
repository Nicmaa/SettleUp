const express = require('express');
const router = express.Router();

const transaction = require('../controllers/transactionController');

const catchAsync = require('../utilities/catchAsync');
const { isLoggedIn, isGroupOwnerOrParticipant, validateTransaction } = require('../middleware.js');

router.route('/new/:id')
    .get(isLoggedIn, isGroupOwnerOrParticipant, catchAsync(transaction.renderNewForm))
    .post(isLoggedIn, isGroupOwnerOrParticipant, validateTransaction, catchAsync(transaction.createTransaction));

router.get('/:id/edit', isLoggedIn, catchAsync(transaction.renderEditForm));

router.route('/:id')
    .patch(isLoggedIn, validateTransaction, catchAsync(transaction.editTransaction))
    .delete(isLoggedIn, catchAsync(transaction.deleteTransaction));

module.exports = router;
