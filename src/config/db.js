const mongoose = require('mongoose');
if(process.env.NODE_ENV !== "production"){
    require('dotenv').config();
}
//'mongodb://127.0.0.1:27017/SettleUp'
const dbUrl = process.env.DB_URL;

const connectDB = async () => {
    try {
        await mongoose.connect(dbUrl);
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
