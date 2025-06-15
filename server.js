// === server.js ===
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const PORT = 3000;

// MongoDB connection URI
const uri = "mongodb+srv://omondoclinton0:oflatkZzNnlVvJK5@cluster0.juksq8h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

let db;
let usersCollection;

app.use(bodyParser.json());
app.use(express.static('public'));

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    db = client.db('InvestmentDB');
    usersCollection = db.collection('users');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}
connectDB();

// ✅ Signup Route with referral
app.post('/api/signup', async (req, res) => {
  try {
    const { fullName, phone, email, password, referralCode } = req.body;

    if (!fullName || !phone || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    let referrer = null;
    if (referralCode) {
      referrer = await usersCollection.findOne({ email: referralCode });
      if (!referrer) {
        return res.status(400).json({ error: 'Invalid referral code' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      fullName,
      phone,
      email,
      password: hashedPassword,
      referrer: referrer ? referrer.email : null,
      createdAt: new Date(),
      balance: 0
    };

    await usersCollection.insertOne(newUser);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ error: 'Internal server error during signup' });
  }
});

// ✅ Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await usersCollection.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ message: 'Login successful', email: user.email });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// ✅ Investment Route with referral commission
app.post('/invest', async (req, res) => {
  try {
    const { amount, email } = req.body;
    if (!amount || amount < 200) {
      return res.status(400).json({ error: 'Invalid investment amount' });
    }

    const investments = db.collection('investments');
    const investment = {
      amount,
      timestamp: new Date(),
      userEmail: email || 'guest@example.com'
    };

    const result = await investments.insertOne(investment);

    // Update user balance
    await usersCollection.updateOne(
      { email },
      { $inc: { balance: amount } }
    );

    // Send referral commission
    const user = await usersCollection.findOne({ email });
    if (user && user.referrer) {
      const commission = amount * 0.20;
      const commissionsCollection = db.collection('commissions');

      await commissionsCollection.insertOne({
        referrerEmail: user.referrer,
        referredEmail: email,
        commissionAmount: commission,
        earnedAt: new Date()
      });

      await usersCollection.updateOne(
        { email: user.referrer },
        { $inc: { balance: commission } }
      );

      console.log(`✅ Commission of KES ${commission} given to ${user.referrer}`);
    }

    res.status(201).json({ message: 'Investment successful', insertedId: result.insertedId });
  } catch (error) {
    console.error('❌ Investment error:', error);
    res.status(500).json({ error: 'Internal server error during investment' });
  }
});

// ✅ Wallet Balance Route
app.get('/api/balance', async (req, res) => {
  const email = req.headers.email || req.query.email;

  if (!email) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ balance: user.balance || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// ✅ Transactions Route
app.get('/api/transactions', async (req, res) => {
  const email = req.headers.email || req.query.email;

  if (!email) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const transactions = await db.collection('transactions')
      .find({ email })
      .sort({ date: -1 })
      .limit(50)
      .toArray();

    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});