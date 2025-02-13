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
    const { title, description, partecipants } = req.body;

    const partecipantsArray = Array.isArray(partecipants)
        ? partecipants.map(name => ({ name }))
        : [{ name: partecipants }];

    const newGroup = new Group({ title, description, partecipants: partecipantsArray });
    await newGroup.save();
    res.redirect('/');
})

app.get('/:title', async (req, res) => {
    const { title } = req.params;
    const group = await Group.findOne({ title });

    if (!group) {
        return res.status(404).send("Group not found");
    }

    const transactions = await Transaction.find({ _id: { $in: group.transactions } })
        .sort({ createdAt: -1 });

    // Calculate total paid
    const totalPaid = transactions.reduce((sum, transaction) => {
        return sum + transaction.payments.reduce((innerSum, payment) => innerSum + payment.amount, 0);
    }, 0);

    // Calculate payments per participant
    const payments = transactions.flatMap(transaction => transaction.payments);
    const mostPaid = payments.reduce((acc, payment) => {
        acc[payment.name] = (acc[payment.name] || 0) + payment.amount;
        return acc;
    }, {});

    const highestPayingUser = Object.entries(mostPaid).reduce((max, [name, amount]) => {
        return amount > max.amount ? { name, amount } : max;
    }, { name: '', amount: 0 });

    // Initialize participant debts
    const participants = group.partecipants || [];
    const participantDebts = {};
    participants.forEach(p => {
        participantDebts[p.name] = {};
        participants.forEach(otherP => {
            if (p.name !== otherP.name) {
                participantDebts[p.name][otherP.name] = 0;
            }
        });
    });

    // Calculate what each person has spent
    const totalSpentPerParticipant = {};
    participants.forEach(p => {
        totalSpentPerParticipant[p.name] = payments
            .filter(payment => payment.name === p.name)
            .reduce((sum, payment) => sum + payment.amount, 0);
    });

    // Calculate the average amount each person should have paid
    const averageShare = totalPaid / participants.length;

    // Calculate balances (positive means they paid more, negative means they paid less)
    const balances = {};
    participants.forEach(p => {
        balances[p.name] = totalSpentPerParticipant[p.name] - averageShare;
    });

    // Sort participants by balance to match debtors with creditors
    const sortedParticipants = [...participants]
        .sort((a, b) => balances[a.name] - balances[b.name]);

    let left = 0;  // index for people who owe money (negative balance)
    let right = sortedParticipants.length - 1;  // index for people who are owed money (positive balance)

    while (left < right) {
        const debtor = sortedParticipants[left].name;
        const creditor = sortedParticipants[right].name;

        const debtorBalance = Math.abs(balances[debtor]);
        const creditorBalance = balances[creditor];

        if (debtorBalance === 0 || creditorBalance === 0) {
            if (debtorBalance === 0) left++;
            if (creditorBalance === 0) right--;
            continue;
        }

        // Calculate the amount to settle between these two participants
        const amount = Math.min(debtorBalance, creditorBalance);

        // Record the debt
        participantDebts[debtor][creditor] = Number(amount.toFixed(2));

        // Update balances
        balances[debtor] += amount;
        balances[creditor] -= amount;

        // Move indices if balances are settled
        if (Math.abs(balances[debtor]) < 0.01) left++;
        if (Math.abs(balances[creditor]) < 0.01) right--;
    }

    res.render('group.ejs', {
        group,
        participants,
        transactions,
        totalPaid,
        highestPayingUser,
        participantDebts
    });
});


app.get('/:title/edit', async (req, res) => {
    const { title } = req.params;
    const group = await Group.findOne({ title });
    res.render('edit.ejs', { group });
})

app.put('/:title', async (req, res) => {
    const titolo = req.params.title;
    const { title, description, partecipants } = req.body;

    const partecipantsArray = Array.isArray(partecipants)
        ? partecipants.map(name => ({ name }))
        : [{ name: partecipants }];

    const group = await Group.findOneAndUpdate({ title: titolo }, { title, description, partecipants: partecipantsArray }, { runValidators: true, new: true });
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

app.listen(3000, () => {
    console.log("Port 3000 opened!");
})
