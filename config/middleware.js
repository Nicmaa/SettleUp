const express = require('express');
const methodOverride = require('method-override');
const engine = require('ejs-mate');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('./passport');

module.exports = (app) => {
    // Configurazione di EJS
    app.engine('ejs', engine);
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));

    // Middleware standard
    app.use(express.urlencoded({ extended: true }));
    app.use(methodOverride('_method'));
    app.use(express.static(path.join(__dirname, '../public')));

    // Configurazione della sessione
    const sessionConfig = {
        secret: process.env.SESSION_SECRET || 'segreto temporaneo',
        resave: false,
        saveUninitialized: true,
        cookie: {
            httpOnly: true, // Sicurezza
            expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // Scadenza dopo una settimana
            maxAge: 1000 * 60 * 60 * 24 * 7,
        }
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
