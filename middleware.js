const Group = require('./models/Group');
const catchAsync = require('./utilities/catchAsync');

// Middleware per controllare se l'utente è autenticato
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'Devi essere loggato per effettuare questa operazione!');
        return res.redirect('/');
    }
    next();
};

// Memorizza il valore returnTo dalla sessione in res.locals
module.exports.storeReturnTo = (req, res, next) => {
    if (req.session.returnTo) {
        res.locals.returnTo = req.session.returnTo;
    }
    next();
};

// Controlla se l'utente è proprietario o partecipante di un gruppo
module.exports.isGroupOwnerOrParticipant = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const group = await Group.findById(id);

    if (!group) {
        req.flash('error', 'Gruppo non trovato!');
        return res.redirect('/api/groups');
    }

    if (
        !group.owner.equals(req.user._id) &&
        !group.participants.some(participant => participant.equals(req.user._id))
    ) {
        req.flash('error', 'Non hai i permessi per vedere questo gruppo!');
        return res.redirect('/api/groups');
    }

    req.group = group;
    next();
});

// Controlla se l'utente è proprietario di un gruppo
module.exports.isGroupOwner = catchAsync(async (req, res, next) => {
    const group = req.group || await Group.findById(req.params.id);

    if (!group) {
        req.flash('error', 'Gruppo non trovato!');
        return res.redirect('/api/groups');
    }

    if (!group.owner.equals(req.user._id)) {
        req.flash('error', 'Non hai i permessi per modificare questo gruppo!');
        return res.redirect(`/api/groups/${req.params.id}`);
    }

    if (!req.group) req.group = group;
    next();
});

// Validazione password
module.exports.validatePasswordStrength = (req, res, next) => {
    const { password } = req.body;

    if (!password) {
        req.flash('error', 'Password mancante!');
        return res.redirect('/');
    }

    if (password.length < 8) {
        req.flash('error', 'La password deve avere almeno 8 caratteri!');
        return res.redirect('/');
    }

    const hasNumber = /\d/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    
    if (!hasNumber || !hasLowerCase || !hasUpperCase) {
        req.flash('error', 'La password deve contenere almeno una lettera maiuscola, una minuscola e un numero!');
        return res.redirect('/');
    }

    next();
};
