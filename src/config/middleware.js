const express = require('express');
const methodOverride = require('method-override');
const engine = require('ejs-mate');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('./passport');
const mongoSanitize = require('express-mongo-sanitize');
const MongoStore = require('connect-mongo');
if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}
const dbUrl = 'mongodb://127.0.0.1:27017/SettleUp'; //process.env.DB_URL
const secret = process.env.SECRET;

module.exports = (app) => {
    // Configurazione di EJS
    app.engine('ejs', engine);
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));

    // Middleware standard
    app.use(express.urlencoded({ extended: true }));
    app.use(methodOverride('_method'));
    app.use(express.static(path.join(__dirname, '../public')));
    app.use(mongoSanitize());

    // Configurazione della sessione
    const store = MongoStore.create({
        mongoUrl: dbUrl,
        touchAfter: 24 * 60 * 60,
        crypto: { secret: secret || 'segreto temporaneo' }
    });
    store.on('error', function (e) {
        console.log("SESSION STORE ERROR!", e);
    })

    const sessionConfig = {
        store,
        name: 'sid_d3f4b1c9e7a2',
        secret: secret || 'segreto temporaneo', 
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', // Attivo solo in produzione
            sameSite: 'lax', // Protezione CSRF
            expires: Date.now() + 1000 * 60 * 60 * 24 * 7, 
            maxAge: 1000 * 60 * 60 * 24 * 7
        },
    };
    
    app.use(session(sessionConfig));

    // Inizializzazione di Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Flash messages
    app.use(flash());

    // Middleware globale per variabili locali
    app.use((req, res, next) => {
        res.locals.currentUser = req.user;
        res.locals.success = req.flash('success');
        res.locals.error = req.flash('error');
        next();
    });
};
