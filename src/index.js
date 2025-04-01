if(process.env.NODE_ENV !== "production"){
    require('dotenv').config();
}
const express = require('express');
const ExpressError = require('./utilities/expressError');

const connectDB = require('./config/db');
const configureMiddleware = require('./config/middleware');

const groupRoutes = require('./routes/groups');
const transactionRoutes = require('./routes/transactions');
const userRoutes = require('./routes/users');

const app = express();
connectDB();
configureMiddleware(app);

//Router
app.use('/users', userRoutes);
app.use('/groups', groupRoutes);
app.use('/transactions', transactionRoutes);

app.get('/', (req,res)=> {
    res.render('home');
});

//Gestione errori generici
app.all(/(.*)/, (req, res, next) => {
    next(new ExpressError('Pagina non Trovata', 404));
});

app.use((err, req, res, next) => {
    const { status = 500, message = "Qualcosa è andato storto!" } = err;
    res.status(status).render('error', { status, message });
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server avviato sulla porta ${PORT}`));
