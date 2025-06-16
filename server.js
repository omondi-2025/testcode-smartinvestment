// === server.js ===
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Check MongoDB URI
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI not found in .env file.");
  process.exit(1);
}

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

let db;
let usersCollection;

// ✅ Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// ✅ Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Health check for Render
app.get('/health', (req, res) => {
  res.send('OK');
});

// ✅ Connect to MongoDB
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

// ✅ Signup with referral
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Login route
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Investment with referral commission
app.post('/invest', async (req, res) => {
  try {
    const { amount, email } = req.body;
    if (!amount || amount < 200) {
      return res.status(400).json({ error: 'Minimum investment is KES 200' });
    }

    const investments = db.collection('investments');
    await investments.insertOne({
      amount,
      timestamp: new Date(),
      userEmail: email
    });

    await usersCollection.updateOne(
      { email },
      { $inc: { balance: amount } }
    );

    // Referral commission
    const user = await usersCollection.findOne({ email });
    if (user?.referrer) {
      const commission = amount * 0.2;
      const commissions = db.collection('commissions');

      await commissions.insertOne({
        referrerEmail: user.referrer,
        referredEmail: email,
        commissionAmount: commission,
        earnedAt: new Date()
      });

      await usersCollection.updateOne(
        { email: user.referrer },
        { $inc: { balance: commission } }
      );

      console.log(`✅ KES ${commission} commission sent to ${user.referrer}`);
    }

    res.status(201).json({ message: 'Investment successful' });
  } catch (error) {
    console.error('❌ Investment error:', error);
    res.status(500).json({ error: 'Investment failed' });
  }
});

// ✅ Wallet balance
app.get('/api/balance', async (req, res) => {
  const email = req.headers.email || req.query.email;
  if (!email) return res.status(401).json({ error: 'Email required' });

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ balance: user.balance || 0 });
  } catch (err) {
    console.error('❌ Balance fetch error:', err);
    res.status(500).json({ error: 'Could not fetch balance' });
  }
});

// ✅ Transaction history
app.get('/api/transactions', async (req, res) => {
  const email = req.headers.email || req.query.email;
  if (!email) return res.status(401).json({ error: 'Email required' });

  try {
    const transactions = await db.collection('transactions')
      .find({ email })
      .sort({ date: -1 })
      .limit(50)
      .toArray();

    res.json(transactions);
  } catch (err) {
    console.error('❌ Transaction error:', err);
    res.status(500).json({ error: 'Could not fetch transactions' });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});