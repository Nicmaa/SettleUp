const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/SettleUp');
        console.log('MongoDB connesso');
    } catch (err) {
        console.error('Errore nella connessione MongoDB:', err);
        process.exit(1);
    }
};

mongoose.connection.on('error', err => {
    console.error('Errore di connessione MongoDB:', err);
});

module.exports = connectDB;
