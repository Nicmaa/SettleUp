const express = require('express');
const router = express.Router();

const group = require('../controllers/groupController');

const catchAsync = require('../utilities/catchAsync');
const { isLoggedIn, isGroupOwnerOrParticipant, isGroupOwner, validateGroup } = require('../middleware.js');

router.route('/')
    .get(isLoggedIn, catchAsync(group.index))
    .post(isLoggedIn, validateGroup, catchAsync(group.createGroup));

router.get('/new', isLoggedIn, catchAsync(group.renderNewForm));

router.route('/:id')
    .get(isLoggedIn, isGroupOwnerOrParticipant, catchAsync(group.showGroup))
    .put(isLoggedIn, isGroupOwner, validateGroup, catchAsync(group.editGroup))
    .delete(isLoggedIn, isGroupOwner, catchAsync(group.deleteGroup));

router.get('/:id/edit', isLoggedIn, isGroupOwner, catchAsync(group.renderEditForm));

module.exports = router;
