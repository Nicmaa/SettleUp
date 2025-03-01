const Group = require('./models/Group');
const Transaction = require('./models/Transaction');

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'Devi essere loggato per effettuare questa operazione!');
        return res.redirect('/');
    }
    next();
};

// Store the returnTo value from session to res.locals
module.exports.storeReturnTo = (req, res, next) => {
    if (req.session.returnTo) {
        res.locals.returnTo = req.session.returnTo;
    }
    next();
};

// Check if user is the owner or participant of a group
module.exports.isGroupOwnerOrParticipant = async (req, res, next) => {
    const { id } = req.params;
    const group = await Group.findById(id);
    
    if (!group) {
        req.flash('error', 'Group not found!');
        return res.redirect('/api/groups');
    }
    
    if (
        !group.owner.equals(req.user._id) && 
        !group.participants.some(participant => participant.equals(req.user._id))
    ) {
        req.flash('error', 'You do not have permission to view this group');
        return res.redirect('/api/groups');
    }
    
    next();
};

// Check if user is the owner of a group
module.exports.isGroupOwner = async (req, res, next) => {
    const { id } = req.params;
    const group = await Group.findById(id);
    
    if (!group) {
        req.flash('error', 'Group not found!');
        return res.redirect('/api/groups');
    }
    
    if (!group.owner.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to modify this group');
        return res.redirect(`/api/groups/${id}`);
    }
    
    next();
};

// Check if user created the transaction or is group owner
module.exports.isTransactionCreator = async (req, res, next) => {
    const { id } = req.params;
    const transaction = await Transaction.findById(id).populate('group');
    
    if (!transaction) {
        req.flash('error', 'Transaction not found!');
        return res.redirect('/api/groups');
    }
    
    const group = await Group.findById(transaction.group._id);
    
    if (
        !transaction.paidBy.equals(req.user._id) && 
        !group.owner.equals(req.user._id)
    ) {
        req.flash('error', 'You do not have permission to modify this transaction');
        return res.redirect(`/api/groups/${transaction.group._id}`);
    }
    
    next();
};

// Validate password strength
module.exports.validatePasswordStrength = (req, res, next) => {
    const { password } = req.body;
    
    if (password && password.length < 8) {
        req.flash('error', 'Password must be at least 8 characters long');
        return res.redirect('/');
    }
    
    // Check for at least one number and one letter
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    
    if (!hasNumber || !hasLetter) {
        req.flash('error', 'Password must contain at least one letter and one number');
        return res.redirect('/');
    }
    
    next();
};
