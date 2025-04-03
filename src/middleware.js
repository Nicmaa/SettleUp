const Group = require('./models/Group');
const catchAsync = require('./utilities/catchAsync');
const ExpressError = require('./utilities/expressError');
const { groupSchema, transactionSchema, userSchema } = require('./joiSchema.js');

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

module.exports.validateParticipants = (participants, currentInvited = [], removeInvited = [], invitedNames = [], invitedEmails = [], userId) => {
    // Set per i partecipanti per evitare duplicati
    const participantsSet = new Set(Array.isArray(participants) ? participants : participants ? [participants] : []);
    participantsSet.add(userId); // L'owner deve sempre essere nei partecipanti

    // Se siamo in modifica, rimuoviamo gli invitati indicati in `removeInvited`
    let invitedUsers = Array.isArray(currentInvited) ? [...currentInvited] : [];
    if (Array.isArray(removeInvited) && removeInvited.length > 0) {
        invitedUsers = invitedUsers.filter(invite => !removeInvited.includes(invite.email));
    }

    // Aggiunta dei nuovi invitati
    if (Array.isArray(invitedEmails) && invitedEmails.length > 0) {
        for (let i = 0; i < invitedEmails.length; i++) {
            const email = invitedEmails[i]?.trim();
            if (email) {
                const name = invitedNames?.[i]?.trim() || `Invitato ${i + 1}`;
                invitedUsers.push({ email, name });
            }
        }
    }

    // Validazione: almeno 2 partecipanti totali
    const totalParticipants = participantsSet.size + invitedUsers.length;
    if (totalParticipants < 2) {
        return { isValid: false, message: 'Devono essere presenti almeno 2 partecipanti!' };
    }

    return {
        isValid: true,
        participants: Array.from(participantsSet),
        invited: invitedUsers
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

    if (!amounts || !amounts.some(item => item.amount > 0)) {
        let redirectUrl = `/transactions/${req.params.id}/edit`;
        if (req.originalUrl.includes('/new')) {
            redirectUrl = `/transactions/new/${req.params.id}`;
        }
        req.flash('error', 'Deve esserci almeno un importo maggiore di 0!');
        return res.redirect(redirectUrl);
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

module.exports.validateUser = (req, res, next) => {
    const { error } = userSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else {
        next();
    }
};
