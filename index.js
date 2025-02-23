const express = require('express');
const methodOverride = require('method-override');
const engine = require('ejs-mate');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');

const connectDB = require('./config/db');
const ExpressError = require('./utilities/expressError');

const groupRoutes = require('./routes/groups');
const transactionRoutes = require('./routes/transactions');
const userRoutes = require('./routes/users');

const app = express();
connectDB();

app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
const sessionConfig = {
    secret: 'segreto temporaneo',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true, //Per questioni di sicurezza
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, //Voglio che scada dopo una settimana (esprimo il tempo in millisecondi)
        maxAge: 1000 * 60 * 60 * 24 * 7,
    }
}
app.use(session(sessionConfig))
app.use(flash());
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

//Router
//app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/transactions', transactionRoutes);


//Gestione errori generici
app.all(/(.*)/, (req, res, next) => {
    next(new ExpressError('Pagina non Trovata', 404));
});

app.use((err, req, res, next) => {
    const { status = 500, message = "Qualcosa è andato storto!" } = err;
    res.status(status).render('error', { status, message });
})

const PORT = 3000;
app.listen(PORT, () => console.log(`Server avviato sulla porta ${PORT}`));
