const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const engine = require('ejs-mate');
const path = require('path');

mongoose.connect('mongodb://127.0.0.1:27017/SettleUp');

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error: "));
db.once("open", () => {
    console.log("Database connected!");
})

const app = express();
const Group = require('./models/groups');
const Transaction = require('./models/transaction');

app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
    const groups = await Group.find({});
    res.render('home.ejs', { groups });
})

app.get('/new', (req, res) => {
    res.render('new.ejs');
})

app.post('/new', async (req, res) => {
    const { title, image, description, partecipants } = req.body;

    const partecipantsArray = Array.isArray(partecipants)
        ? partecipants.map(name => ({ name }))
        : [{ name: partecipants }];

    const newGroup = new Group({ title, image, description, partecipants: partecipantsArray });
    await newGroup.save();
    res.redirect('/');
})

app.get('/:title', async (req, res) => {
    const { title } = req.params;
    const group = await Group.findOne({ title });

    if (!group) {
        return res.status(404).send("Group not found");
    }

    const transactions = await Transaction.find({ _id: { $in: group.transactions } }).sort({ createdAt: -1 });

    // Aggrega i pagamenti per persona
    let paymentMap = new Map();

    transactions.forEach(transaction => {
        transaction.payments.forEach(payment => {
            if (paymentMap.has(payment.name)) {
                paymentMap.set(payment.name, paymentMap.get(payment.name) + payment.amount);
            } else {
                paymentMap.set(payment.name, payment.amount);
            }
        });
    });

    // Converte la mappa in un array
    let payments = Array.from(paymentMap, ([name, amount]) => ({ name, amount }));

    // Calcola il totale e la quota per persona
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    const perPerson = total / payments.length;

    // Calcola il bilancio di ciascuno
    let balances = payments.map(p => ({
        name: p.name,
        balance: p.amount - perPerson
    }));

    // Separa creditori (+) e debitori (-)
    let creditors = balances.filter(p => p.balance > 0).sort((a, b) => b.balance - a.balance);
    let debtors = balances.filter(p => p.balance < 0).sort((a, b) => a.balance - b.balance);

    // Lista delle transazioni per bilanciare
    let transactionsToSettle = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];

        let amountToPay = Math.min(-debtor.balance, creditor.balance);

        transactionsToSettle.push({
            from: debtor.name,
            to: creditor.name,
            amount: amountToPay.toFixed(2)
        });

        // Aggiorna i bilanci
        debtor.balance += amountToPay;
        creditor.balance -= amountToPay;

        // Se qualcuno ha saldo 0, passa al successivo
        if (debtor.balance === 0) i++;
        if (creditor.balance === 0) j++;
    }

    res.render('group.ejs', { group, total, transactionsToSettle, transactions });
});

app.get('/:title/edit', async (req, res) => {
    const { title } = req.params;
    const group = await Group.findOne({ title });
    res.render('edit.ejs', { group });
})

app.put('/:title', async (req, res) => {
    const titolo = req.params.title;
    const { title, image, description, partecipants } = req.body;

    const partecipantsArray = Array.isArray(partecipants)
        ? partecipants.map(name => ({ name }))
        : [{ name: partecipants }];

    const group = await Group.findOneAndUpdate({ title: titolo }, { title, image, description, partecipants: partecipantsArray }, { runValidators: true, new: true });
    res.redirect(`/${group.title}`);
})

app.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const group = await Group.findById(id);
    for (let transactionId of group.transactions) {
        await Transaction.findByIdAndDelete(transactionId);
    }
    await Group.findByIdAndDelete(id);
    res.redirect('/');
});

app.delete('/:id/:transId', async (req, res) => {
    const { id, transId } = req.params;
    const group = await Group.findById(id);
    if (group.transactions.includes(transId)) {
        await Transaction.findByIdAndDelete(transId);

        await Group.findByIdAndUpdate(id, {
            $pull: { transactions: transId }
        });
    }
    res.redirect(`/${group.title}`);
});

app.get('/:title/newTransaction', async (req, res) => {
    const { title } = req.params;
    const group = await Group.findOne({ title });
    res.render('newTransaction.ejs', { group });
})

app.post('/:title/newTransaction', async (req, res) => {
    const { title } = req.params;
    const group = await Group.findOne({ title });
    const payments = req.body.name.map((name, index) => ({
        name,
        amount: parseFloat(req.body.amount[index]) || 0
    }));
    const newTrans = new Transaction({ group: group._id, payments });
    await newTrans.save();
    group.transactions.push(newTrans._id);
    await group.save();
    res.redirect(`/${title}`);
})

app.get('/:title/:transId/editTransaction', async (req, res) => {
    const { title, transId } = req.params;
    const group = await Group.findOne({ title });
    const transaction = await Transaction.findById(transId);
    res.render('editTransaction.ejs', { group, transaction });
})

app.patch('/:title/:transId', async (req, res) => {
    const { title, transId } = req.params;
    const group = await Group.findOne({ title });
    const payments = req.body.name.map((name, index) => ({
        name,
        amount: parseFloat(req.body.amount[index]) || 0
    }));
    await Transaction.findByIdAndUpdate(transId,{payments});
    res.redirect(`/${title}`);
})

app.listen(3000, () => {
    console.log("Port 3000 opened!");
})
