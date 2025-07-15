const express = require('express');
const router = express.Router();
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

// POST /api/withdraw - Submit a withdrawal request
router.post('/', async (req, res) => {
  const { userId, amount, mpesa } = req.body;

  if (!userId || !amount || !mpesa) {
    return res.status(400).json({ success: false, message: '❗ All fields are required.' });
  }

  if (amount < 150) {
    return res.status(400).json({ success: false, message: '⚠️ Minimum withdrawal is KES 150.' });
  }

  const currentHour = new Date().getHours();
  if (currentHour < 9 || currentHour >= 18) {
    return res.status(400).json({
      success: false,
      message: '⏰ Withdrawals are allowed only between 9am and 6pm.'
    });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '❌ User not found.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const countToday = await Withdrawal.countDocuments({
      user: userId,
      date: { $gte: today }
    });

    if (countToday >= 1) {
      return res.status(400).json({
        success: false,
        message: '⚠️ Only one withdrawal allowed per day.'
      });
    }

    if (user.wallet < amount) {
      return res.status(400).json({ success: false, message: '💰 Insufficient wallet balance.' });
    }

    const tax = Math.round(amount * 0.18);
    const finalAmount = amount - tax;

    const withdrawal = new Withdrawal({
      user: userId,
      amount: finalAmount,
      mpesa,
      status: 'pending',
      date: new Date()
    });

    await withdrawal.save();

user.wallet -= amount; // Deduct full amount including tax
user.cashouts = Number(user.cashouts || 0) + finalAmount; // Track actual amount user received
await user.save(); // Save the updated user

    res.json({
      success: true,
      message: '✅ Withdrawal request submitted and pending admin approval.'
    });
  } catch (err) {
    console.error('❌ Withdrawal error:', err);
    res.status(500).json({ success: false, message: '🚫 Server error.' });
  }
});

// ✅ FIXED: GET /api/withdrawals instead of /api/withdraw
router.get('/withdrawals', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ success: false, message: '❗ Missing userId.' });
  }

  try {
    const history = await Withdrawal.find({ user: userId }).sort({ date: -1 });
    res.json({ success: true, history });
  } catch (err) {
    console.error('❌ Fetch withdrawal history error:', err);
    res.status(500).json({ success: false, message: '🚫 Failed to load withdrawal history.' });
  }
});

// ✅ GET /api/withdrawals/today — Check if user has withdrawn today
router.get("/today", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ success: false, message: "❗ Missing userId." });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasWithdrawn = await Withdrawal.findOne({
      user: userId,
      date: { $gte: today }
    });

    res.json({ withdrawnToday: !!hasWithdrawn });
  } catch (err) {
    console.error("❌ Error checking today's withdrawal:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;