const Group = require('./models/Group');
const catchAsync = require('./utilities/catchAsync');
const ExpressError = require('./utilities/expressError');
const { groupSchema, transactionSchema } = require('./joiSchema.js');

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
        return res.redirect('/groups');
    }

    if (
        !group.owner.equals(req.user._id) &&
        !group.participants.some(participant => participant.equals(req.user._id))
    ) {
        req.flash('error', 'Non hai i permessi per vedere questo gruppo!');
        return res.redirect('/groups');
    }

    req.group = group;
    next();
});

// Controlla se l'utente è proprietario di un gruppo
module.exports.isGroupOwner = catchAsync(async (req, res, next) => {
    const group = req.group || await Group.findById(req.params.id);

    if (!group) {
        req.flash('error', 'Gruppo non trovato!');
        return res.redirect('/groups');
    }

    if (!group.owner.equals(req.user._id)) {
        req.flash('error', 'Non hai i permessi per modificare questo gruppo!');
        return res.redirect(`/groups/${req.params.id}`);
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

module.exports.validateParticipants = (participants, invited, userId) => {
    // Controllo numero minimo partecipanti
    if (!participants && !invited || participants.length + invited.length < 2) {
        return { isValid: false, message: 'Devono essere presenti almeno 2 partecipanti!' };
    }

    // Controllo presenza del proprietario nei partecipanti
    const participantsArray = Array.isArray(participants) ? [...participants] : [participants];
    const hasOwner = participantsArray.includes(userId.toString());

    // Controllo duplicati
    const participantsSet = new Set(participantsArray);
    if (participantsSet.size !== participantsArray.length) {
        return { isValid: false, message: 'Hai inserito lo stesso partecipante più volte!' };
    }

    return {
        isValid: true,
        participants: hasOwner ? participantsArray : [...participantsArray, userId.toString()]
    };
};

module.exports.validateGroup = (req, res, next) => {
    const { error } = groupSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else {
        next();
    }
};

module.exports.validateTransaction = (req, res, next) => {
    if ((!req.body.user || !req.body.amount) && (!req.body.invitedUsername || !req.body.invitedAmount)) {
        throw new ExpressError("Dati della transazione mancanti", 400);
    }

    // Inizializza gli array se non esistono
    req.body.user = req.body.user || [];
    req.body.amount = req.body.amount || [];
    req.body.invitedUsername = req.body.invitedUsername || [];
    req.body.invitedAmount = req.body.invitedAmount || [];

    const amounts = [];

    for (let i = 0; i < req.body.user.length; i++) {
        const amount = parseFloat(req.body.amount[i]) || 0;
        amounts.push({
            user: req.body.user[i],
            amount: amount,
            isInvited: false
        });
    }
    for (let i = 0; i < req.body.invitedUsername.length; i++) {
        const amount = parseFloat(req.body.invitedAmount[i]) || 0;
        amounts.push({
            user: req.body.invitedUsername[i],
            amount: amount,
            isInvited: true
        });
    }

    const transformedData = {
        description: req.body.description || '',
        category: req.body.category || 'Altro',
        amounts: amounts
    };

    const { error } = transactionSchema.validate(transformedData);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else {
        req.body = transformedData;
        next();
    }
};
