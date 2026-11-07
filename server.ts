import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Merchant Credentials from User Specification
const WATCHPAYS_MERCHANT_ID = process.env.WATCHPAYS_MERCHANT_ID || '100666059';
const WATCHPAYS_API_KEY = process.env.WATCHPAYS_API_KEY || '02198abbdfd5bf52f621c4a217a1387f';
const WATCHPAYS_API_ENDPOINT = 'https://api.watchpays.com/v1/create';

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Step 1-6 WatchPays MD5 signature calculation:
 */
export function generateWatchPaysSignature(
  params: Record<string, string | number>,
  apiKey: string
): { signature: string; signStr: string } {
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      filtered[k] = String(v);
    }
  }

  const sortedKeys = Object.keys(filtered).sort();
  let signStr = '';
  for (const k of sortedKeys) {
    signStr += `${k}=${filtered[k]}&`;
  }
  signStr += `key=${apiKey}`;

  const signature = crypto.createHash('md5').update(signStr).digest('hex');
  return { signature, signStr };
}

// Helper to format user model with nested bankDetails and camelCase fields matching frontend UserAccount
function formatUserResponse(user: any) {
  if (!user) return null;
  const mobile = user.mobile;
  const collections = db.prepare('SELECT * FROM purchased_plans WHERE user_mobile = ? ORDER BY created_at DESC').all(mobile);
  const transactions = db.prepare('SELECT * FROM transactions WHERE user_mobile = ? ORDER BY created_at DESC').all(mobile);

  return {
    ...user,
    uid: user.uid,
    mobile: user.mobile,
    password: user.password,
    withdrawalPassword: user.withdrawal_password,
    inviteCode: user.invite_code,
    referredBy: user.referred_by,
    vipLevel: user.vip_level ?? 1,
    availableBalance: user.available_balance ?? 0,
    totalRecharge: user.total_recharge ?? 0,
    totalIncome: user.total_income ?? 0,
    fixedIncome: user.fixed_income ?? 0,
    teamRecharge: user.team_recharge ?? 0,
    teamSize: user.team_size ?? 0,
    bankDetails: {
      holderName: user.holder_name || '',
      bankName: user.bank_name || '',
      accountNumber: user.account_number || '',
      ifscCode: user.ifsc_code || '',
      upiId: user.upi_id || '',
    },
    collections: collections.map((c: any) => ({
      id: c.id,
      planId: c.plan_id,
      title: c.title,
      price: c.price,
      dailyIncome: c.daily_income,
      days: c.days,
      totalIncome: c.total_income,
      status: c.status,
      purchasedAt: c.created_at,
    })),
    transactions: transactions.map((t: any) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      method: t.method,
      utr: t.utr,
      status: t.status,
      timestamp: t.created_at,
    })),
    teamMembers: [],
  };
}

// ==========================================
// 1. USER AUTHENTICATION & PROFILE APIS
// ==========================================

// Register User (Checks duplicate mobile, saves to centralized SQLite database)
app.post('/api/auth/register', (req, res) => {
  try {
    const { mobile, password, withdrawalPassword, inviteCode, referredBy } = req.body;
    const cleanedMobile = String(mobile || '').replace(/\D/g, '');

    if (cleanedMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें' });
    }

    const existing = db.prepare('SELECT mobile FROM users WHERE mobile = ?').get(cleanedMobile);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'यह फोन नंबर पहले से रजिस्टर्ड है! कृपया सीधे लॉगिन करें',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'लॉगिन पासवर्ड कम से कम 6 अक्षरों का होना चाहिए' });
    }
    if (!withdrawalPassword || withdrawalPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'निकासी पासवर्ड कम से कम 6 अंकों का होना चाहिए' });
    }

    const uid = String(Math.floor(10000 + Math.random() * 90000));
    const randomInvite = Math.random().toString(36).substring(2, 8).toUpperCase();
    const cleanRef = (referredBy || inviteCode || 'D99DE2').trim().toUpperCase();

    // Fetch signup bonus from site settings
    const bonusSetting = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('signupBonus') as { value: string } | undefined;
    const signupBonus = bonusSetting ? parseFloat(bonusSetting.value) || 25.0 : 25.0;

    // Insert user
    db.prepare(`
      INSERT INTO users (
        mobile, uid, password, withdrawal_password, invite_code, referred_by,
        vip_level, available_balance, total_recharge, total_income, fixed_income,
        team_recharge, team_size
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, 0.0, 0.0, 0.0, 0.0, 0)
    `).run(cleanedMobile, uid, password, withdrawalPassword, randomInvite, cleanRef, signupBonus);

    // If referrer exists, increment team_size
    const referrer = db.prepare('SELECT mobile, team_size FROM users WHERE invite_code = ?').get(cleanRef) as { mobile: string; team_size: number } | undefined;
    if (referrer) {
      db.prepare('UPDATE users SET team_size = team_size + 1 WHERE mobile = ?').run(referrer.mobile);
    }

    // Add signup bonus transaction
    db.prepare(`
      INSERT INTO transactions (id, user_mobile, type, amount, method, utr, status)
      VALUES (?, ?, 'Signup Bonus', ?, 'Toing Welcome Bonus', ?, 'Success')
    `).run('tx-reg-' + Date.now(), cleanedMobile, signupBonus, 'BONUS' + uid);

    const user = db.prepare('SELECT * FROM users WHERE mobile = ?').get(cleanedMobile);
    return res.json({ success: true, user: formatUserResponse(user), message: 'रजिस्ट्रेशन सफल!' });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Server error during registration' });
  }
});

// Login User
app.post('/api/auth/login', (req, res) => {
  try {
    const { mobile, password } = req.body;
    const cleanedMobile = String(mobile || '').replace(/\D/g, '');

    if (cleanedMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें' });
    }

    const user = db.prepare('SELECT * FROM users WHERE mobile = ?').get(cleanedMobile) as any;
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'यह फोन नंबर रजिस्टर नहीं है! केवल रजिस्टर्ड नंबर से ही लॉगिन करें',
      });
    }

    if (user.password !== password) {
      return res.status(400).json({ success: false, message: 'गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें' });
    }

    return res.json({ success: true, user: formatUserResponse(user), message: 'Login successful' });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Server error during login' });
  }
});

// Get User Live Data (Includes Collections and Transactions)
app.get('/api/user/:mobile', (req, res) => {
  try {
    const { mobile } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE mobile = ?').get(mobile) as any;
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      user: formatUserResponse(user),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Update Bank Details
app.post('/api/user/bank-details', (req, res) => {
  try {
    const { mobile, holderName, bankName, accountNumber, ifscCode, upiId } = req.body;
    db.prepare(`
      UPDATE users SET
        holder_name = ?, bank_name = ?, account_number = ?, ifsc_code = ?, upi_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE mobile = ?
    `).run(holderName || '', bankName || '', accountNumber || '', ifscCode || '', upiId || '', mobile);

    return res.json({ success: true, message: 'Bank details saved successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Buy Plan with Available Balance
app.post('/api/plans/buy', (req, res) => {
  try {
    const { mobile, planId, price, title, dailyIncome, days, totalIncome } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE mobile = ?').get(mobile) as any;

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const numPrice = parseFloat(price);
    if (user.available_balance < numPrice) {
      return res.status(400).json({
        success: false,
        message: `अपर्याप्त बैलेंस! प्लान खरीदने के लिए ₹${numPrice} चाहिए।`,
      });
    }

    // Deduct balance and add plan
    db.prepare(`
      UPDATE users SET
        available_balance = available_balance - ?,
        fixed_income = fixed_income + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE mobile = ?
    `).run(numPrice, parseFloat(totalIncome), mobile);

    const planUid = 'col-' + Date.now();
    db.prepare(`
      INSERT INTO purchased_plans (id, user_mobile, plan_id, title, price, daily_income, days, total_income, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
    `).run(planUid, mobile, planId, title, numPrice, parseFloat(dailyIncome), parseInt(days, 10), parseFloat(totalIncome));

    // Record Transaction
    db.prepare(`
      INSERT INTO transactions (id, user_mobile, type, amount, method, utr, status)
      VALUES (?, ?, 'Plan Purchase', ?, 'Available Balance Wallet', ?, 'Success')
    `).run('tx-plan-' + Date.now(), mobile, numPrice, 'PLAN' + Date.now());

    // Referrer Team Commission if applicable
    if (user.referred_by) {
      const referrer = db.prepare('SELECT mobile FROM users WHERE invite_code = ?').get(user.referred_by) as { mobile: string } | undefined;
      if (referrer) {
        const commSetting = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('teamCommissionL1') as { value: string } | undefined;
        const commPercent = commSetting ? parseFloat(commSetting.value) || 10 : 10;
        const commissionAmt = (numPrice * commPercent) / 100;

        db.prepare(`
          UPDATE users SET
            available_balance = available_balance + ?,
            total_income = total_income + ?,
            team_recharge = team_recharge + ?
          WHERE mobile = ?
        `).run(commissionAmt, commissionAmt, numPrice, referrer.mobile);

        db.prepare(`
          INSERT INTO transactions (id, user_mobile, type, amount, method, utr, status)
          VALUES (?, ?, 'Daily Income', ?, 'Referral Team Commission', ?, 'Success')
        `).run('tx-comm-' + Date.now(), referrer.mobile, commissionAmt, 'COMM' + Date.now());
      }
    }

    const updatedUser = db.prepare('SELECT * FROM users WHERE mobile = ?').get(mobile);
    return res.json({ success: true, user: formatUserResponse(updatedUser), message: 'Plan activated successfully!' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Claim Daily Income
app.post('/api/plans/claim-income', (req, res) => {
  try {
    const { mobile, collectionId } = req.body;
    const plan = db.prepare('SELECT * FROM purchased_plans WHERE id = ? AND user_mobile = ?').get(collectionId, mobile) as any;

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    db.prepare(`
      UPDATE users SET
        available_balance = available_balance + ?,
        total_income = total_income + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE mobile = ?
    `).run(plan.daily_income, plan.daily_income, mobile);

    db.prepare(`
      INSERT INTO transactions (id, user_mobile, type, amount, method, utr, status)
      VALUES (?, ?, 'Daily Income', ?, ?, ?, 'Success')
    `).run('tx-inc-' + Date.now(), mobile, plan.daily_income, plan.title, 'INC' + Date.now());

    return res.json({ success: true, message: `₹${plan.daily_income} credited to your available balance!` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// User Withdrawal
app.post('/api/withdraw', (req, res) => {
  try {
    const { mobile, amount, withdrawPassword } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE mobile = ?').get(mobile) as any;

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const numAmount = parseFloat(amount);
    const minSetting = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('minWithdrawal') as { value: string } | undefined;
    const minWithdrawal = minSetting ? parseFloat(minSetting.value) || 100 : 100;

    if (numAmount < minWithdrawal) {
      return res.status(400).json({ success: false, message: `Minimum withdrawal amount is ₹${minWithdrawal}` });
    }

    if (numAmount > user.available_balance) {
      return res.status(400).json({ success: false, message: 'Insufficient Available Balance' });
    }

    if (user.withdrawal_password !== withdrawPassword) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal password' });
    }

    // Deduct balance
    db.prepare(`
      UPDATE users SET
        available_balance = available_balance - ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE mobile = ?
    `).run(numAmount, mobile);

    const wdId = 'wd-' + Date.now();
    db.prepare(`
      INSERT INTO withdrawal_requests (
        id, user_mobile, user_uid, amount, bank_name, holder_name, account_number, ifsc_code, upi_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    `).run(
      wdId,
      mobile,
      user.uid,
      numAmount,
      user.bank_name || 'IMPS Bank',
      user.holder_name || 'Account Holder',
      user.account_number || '',
      user.ifsc_code || '',
      user.upi_id || ''
    );

    db.prepare(`
      INSERT INTO transactions (id, user_mobile, type, amount, method, utr, status)
      VALUES (?, ?, 'Withdrawal', ?, ?, ?, 'Pending')
    `).run(wdId, mobile, numAmount, user.bank_name || 'Bank Transfer', wdId);

    return res.json({ success: true, message: `Withdrawal request of ₹${numAmount} submitted!` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// ==========================================
// 2. WATCHPAYS (TOING PAY) PAYMENT GATEWAY
// ==========================================

// Create Payment Order Route
app.post('/api/watchpays/create', async (req, res) => {
  try {
    const { amount, userId, planId, extra } = req.body;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount < 1) {
      return res.status(400).json({ success: false, message: 'Invalid amount provided' });
    }

    const formattedAmount = numAmount.toFixed(2);
    const merchantOrderNo = `ORD${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = req.get('host') || 'localhost:3000';
    const callbackUrl = process.env.APP_URL
      ? `${process.env.APP_URL}/api/watchpays/callback`
      : `${proto}://${host}/api/watchpays/callback`;

    const signParams = {
      merchant_id: WATCHPAYS_MERCHANT_ID,
      amount: formattedAmount,
      merchant_order_no: merchantOrderNo,
      callback_url: callbackUrl,
    };

    const { signature } = generateWatchPaysSignature(signParams, WATCHPAYS_API_KEY);

    const payload = {
      merchant_id: WATCHPAYS_MERCHANT_ID,
      api_key: WATCHPAYS_API_KEY,
      amount: formattedAmount,
      merchant_order_no: merchantOrderNo,
      callback_url: callbackUrl,
      extra: extra || userId || 'toing_user',
      signature,
    };

    console.log('[WatchPays Create] Calling WatchPays API:', { merchantOrderNo, formattedAmount });

    const upstreamResponse = await fetch(WATCHPAYS_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const rawText = await upstreamResponse.text();
    let upstreamData: any = null;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        upstreamData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse WatchPays JSON:', e);
      }
    }

    if (upstreamData && upstreamData.success) {
      // Save order in SQLite database
      db.prepare(`
        INSERT INTO deposit_orders (
          id, merchant_order_no, order_no, user_mobile, amount, status, payment_url, method, extra
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, 'Toing pay', ?)
      `).run(
        'dep-' + Date.now(),
        merchantOrderNo,
        upstreamData.order_no || '',
        userId || '7667340426',
        numAmount,
        upstreamData.payment_url || '',
        extra || ''
      );

      return res.json({
        success: true,
        merchant_order_no: merchantOrderNo,
        order_no: upstreamData.order_no,
        amount: formattedAmount,
        payment_url: upstreamData.payment_url,
        status: upstreamData.status || 'created',
      });
    }

    const errorMsg = upstreamData?.message || 'WatchPays payment creation failed';
    return res.status(400).json({
      success: false,
      message: errorMsg,
      merchant_order_no: merchantOrderNo,
    });
  } catch (error: any) {
    console.error('[WatchPays Create Error]:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Server error communicating with payment gateway',
    });
  }
});

// WatchPays Callback Webhook
app.post('/api/watchpays/callback', (req, res) => {
  try {
    const { orderNo, merchantOrder, status, amount } = req.body;
    console.log('[WatchPays Callback Received]:', req.body);

    if (!merchantOrder) return res.status(400).send('Missing merchantOrder');

    const order = db.prepare('SELECT * FROM deposit_orders WHERE merchant_order_no = ?').get(merchantOrder) as any;
    if (order && order.status !== 'Success' && status === 'success') {
      db.prepare(`
        UPDATE deposit_orders SET status = 'Success', order_no = ?, updated_at = CURRENT_TIMESTAMP WHERE merchant_order_no = ?
      `).run(orderNo || '', merchantOrder);

      // Credit user's wallet
      const numAmt = parseFloat(amount) || order.amount;
      db.prepare(`
        UPDATE users SET
          available_balance = available_balance + ?,
          total_recharge = total_recharge + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE mobile = ?
      `).run(numAmt, numAmt, order.user_mobile);

      db.prepare(`
        INSERT INTO transactions (id, user_mobile, type, amount, method, utr, status)
        VALUES (?, ?, 'Recharge', ?, 'Toing pay Gateway', ?, 'Success')
      `).run('tx-rec-' + Date.now(), order.user_mobile, numAmt, merchantOrder);

      console.log(`[WatchPays Callback] User ${order.user_mobile} credited with ₹${numAmt}`);
    }

    return res.status(200).send('success');
  } catch (err) {
    console.error('[WatchPays Callback Error]:', err);
    return res.status(200).send('success');
  }
});

// Check Order Status
app.get('/api/watchpays/order/:merchantOrder', (req, res) => {
  const { merchantOrder } = req.params;
  const order = db.prepare('SELECT * FROM deposit_orders WHERE merchant_order_no = ?').get(merchantOrder) as any;

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  return res.json({
    success: true,
    order: {
      merchantOrderNo: order.merchant_order_no,
      orderNo: order.order_no,
      amount: order.amount,
      status: order.status,
      paymentUrl: order.payment_url,
      updatedAt: order.updated_at,
    },
  });
});

// Simulate / Test Instant Callback
app.post('/api/watchpays/simulate-callback', (req, res) => {
  const { merchantOrder, utr, mobile, amount } = req.body;
  let order = db.prepare('SELECT * FROM deposit_orders WHERE merchant_order_no = ?').get(merchantOrder) as any;

  if (!order && mobile && amount) {
    const newOrd = merchantOrder || 'ORD' + Date.now();
    db.prepare(`
      INSERT INTO deposit_orders (id, merchant_order_no, order_no, user_mobile, amount, status, payment_url, method)
      VALUES (?, ?, ?, ?, ?, 'pending', '', 'Toing pay Manual')
    `).run('dep-' + Date.now(), newOrd, utr || newOrd, mobile, parseFloat(amount));
    order = db.prepare('SELECT * FROM deposit_orders WHERE merchant_order_no = ?').get(newOrd) as any;
  }

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.status !== 'Success') {
    db.prepare(`
      UPDATE deposit_orders SET status = 'Success', order_no = ?, updated_at = CURRENT_TIMESTAMP WHERE merchant_order_no = ?
    `).run(utr || order.order_no || merchantOrder, merchantOrder);

    db.prepare(`
      UPDATE users SET
        available_balance = available_balance + ?,
        total_recharge = total_recharge + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE mobile = ?
    `).run(order.amount, order.amount, order.user_mobile);

    db.prepare(`
      INSERT INTO transactions (id, user_mobile, type, amount, method, utr, status)
      VALUES (?, ?, 'Recharge', ?, 'Toing pay Gateway', ?, 'Success')
    `).run('tx-rec-' + Date.now(), order.user_mobile, order.amount, utr || merchantOrder);
  }

  return res.json({ success: true, message: 'Order marked as SUCCESS', order });
});

// ==========================================
// 3. ADMIN MANAGEMENT APIS (SCALE: 100K+ USERS)
// ==========================================

// Admin Dashboard Overview Stats
app.get('/api/admin/stats', (req, res) => {
  try {
    const totalUsers = (db.prepare('SELECT count(*) as count FROM users').get() as any).count;
    const totalBalance = (db.prepare('SELECT sum(available_balance) as sum FROM users').get() as any).sum || 0;
    const totalRecharge = (db.prepare('SELECT sum(total_recharge) as sum FROM users').get() as any).sum || 0;
    const pendingWithdrawalsSum = (db.prepare("SELECT sum(amount) as sum FROM withdrawal_requests WHERE status = 'Pending'").get() as any).sum || 0;
    const pendingWithdrawalsCount = (db.prepare("SELECT count(*) as count FROM withdrawal_requests WHERE status = 'Pending'").get() as any).count || 0;

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalBalance,
        totalRecharge,
        pendingWithdrawalsSum,
        pendingWithdrawalsCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Get All Users (Paginated & Searchable by Mobile/UID)
app.get('/api/admin/users', (req, res) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';
    const limit = parseInt(String(req.query.limit || '100'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);

    let users;
    let totalCount;

    if (search) {
      users = db.prepare(`
        SELECT * FROM users
        WHERE mobile LIKE ? OR uid LIKE ? OR invite_code LIKE ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).all(`%${search}%`, `%${search}%`, `%${search}%`, limit, offset);

      totalCount = (db.prepare(`
        SELECT count(*) as count FROM users
        WHERE mobile LIKE ? OR uid LIKE ? OR invite_code LIKE ?
      `).get(`%${search}%`, `%${search}%`, `%${search}%`) as any).count;
    } else {
      users = db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
      totalCount = (db.prepare('SELECT count(*) as count FROM users').get() as any).count;
    }

    return res.json({ success: true, users, totalCount });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Admin Add / Deduct User Balance
app.post('/api/admin/user/balance', (req, res) => {
  try {
    const { mobile, amount, type } = req.body;
    const numAmt = parseFloat(amount);

    if (isNaN(numAmt) || numAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    if (type === 'add') {
      db.prepare(`
        UPDATE users SET available_balance = available_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE mobile = ?
      `).run(numAmt, mobile);

      db.prepare(`
        INSERT INTO transactions (id, user_mobile, type, amount, method, utr, status)
        VALUES (?, ?, 'Recharge', ?, 'Admin Manual Credit', ?, 'Success')
      `).run('tx-adm-' + Date.now(), mobile, numAmt, 'ADM' + Date.now());
    } else {
      db.prepare(`
        UPDATE users SET available_balance = MAX(0, available_balance - ?), updated_at = CURRENT_TIMESTAMP WHERE mobile = ?
      `).run(numAmt, mobile);

      db.prepare(`
        INSERT INTO transactions (id, user_mobile, type, amount, method, utr, status)
        VALUES (?, ?, 'Withdrawal', ?, 'Admin Manual Deduction', ?, 'Success')
      `).run('tx-adm-' + Date.now(), mobile, numAmt, 'ADM' + Date.now());
    }

    const updated = db.prepare('SELECT * FROM users WHERE mobile = ?').get(mobile);
    return res.json({ success: true, user: formatUserResponse(updated), message: 'Balance updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Admin Delete User
app.post('/api/admin/user/delete', (req, res) => {
  try {
    const { mobile } = req.body;
    db.prepare('DELETE FROM users WHERE mobile = ?').run(mobile);
    db.prepare('DELETE FROM transactions WHERE user_mobile = ?').run(mobile);
    db.prepare('DELETE FROM purchased_plans WHERE user_mobile = ?').run(mobile);
    return res.json({ success: true, message: `User ${mobile} deleted` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Admin Get Deposits
app.get('/api/admin/deposits', (req, res) => {
  try {
    const deposits = db.prepare('SELECT * FROM deposit_orders ORDER BY created_at DESC LIMIT 100').all();
    return res.json({ success: true, deposits });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Admin Approve Deposit
app.post('/api/admin/deposit/approve', (req, res) => {
  try {
    const { orderId } = req.body;
    const order = db.prepare('SELECT * FROM deposit_orders WHERE id = ? OR merchant_order_no = ?').get(orderId, orderId) as any;

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.status !== 'Success') {
      db.prepare("UPDATE deposit_orders SET status = 'Success', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(order.id);

      db.prepare(`
        UPDATE users SET
          available_balance = available_balance + ?,
          total_recharge = total_recharge + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE mobile = ?
      `).run(order.amount, order.amount, order.user_mobile);

      db.prepare(`
        INSERT INTO transactions (id, user_mobile, type, amount, method, utr, status)
        VALUES (?, ?, 'Recharge', ?, 'Admin Approved Toing pay', ?, 'Success')
      `).run('tx-rec-' + Date.now(), order.user_mobile, order.amount, order.merchant_order_no);
    }

    return res.json({ success: true, message: 'Deposit approved & balance credited!' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Admin Get Withdrawals
app.get('/api/admin/withdrawals', (req, res) => {
  try {
    const withdrawals = db.prepare('SELECT * FROM withdrawal_requests ORDER BY created_at DESC LIMIT 100').all();
    return res.json({ success: true, withdrawals });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Admin Approve Withdrawal Payout
app.post('/api/admin/withdrawal/approve', (req, res) => {
  try {
    const { id, utr } = req.body;
    const finalUtr = utr || 'UTR' + Math.floor(100000000000 + Math.random() * 899999999999);

    db.prepare(`
      UPDATE withdrawal_requests SET status = 'Approved', utr = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(finalUtr, id);

    db.prepare(`
      UPDATE transactions SET status = 'Success', utr = ? WHERE id = ? OR utr = ?
    `).run(finalUtr, id, id);

    return res.json({ success: true, message: 'Withdrawal payout marked as Approved' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Admin Reject Withdrawal Payout & Refund
app.post('/api/admin/withdrawal/reject', (req, res) => {
  try {
    const { id } = req.body;
    const request = db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(id) as any;

    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (request.status === 'Pending') {
      db.prepare("UPDATE withdrawal_requests SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

      db.prepare(`
        UPDATE transactions SET status = 'Failed' WHERE id = ? OR utr = ?
      `).run(id, id);

      // Refund to user's wallet
      db.prepare(`
        UPDATE users SET available_balance = available_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE mobile = ?
      `).run(request.amount, request.user_mobile);

      db.prepare(`
        INSERT INTO transactions (id, user_mobile, type, amount, method, utr, status)
        VALUES (?, ?, 'Recharge', ?, 'Withdrawal Refund', ?, 'Success')
      `).run('tx-ref-' + Date.now(), request.user_mobile, request.amount, 'REF' + Date.now());
    }

    return res.json({ success: true, message: 'Withdrawal rejected and refunded to user balance' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Admin Get Plans
app.get('/api/admin/plans', (req, res) => {
  try {
    const plans = db.prepare('SELECT * FROM investment_plans WHERE is_active = 1 ORDER BY price ASC').all();
    return res.json({ success: true, plans });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Admin Save Plan (Create or Update)
app.post('/api/admin/plans/save', (req, res) => {
  try {
    const { id, category, badgeTitle, price, dailyIncome, days, totalIncome } = req.body;
    const planId = id || 'plan-' + Date.now();

    db.prepare(`
      INSERT INTO investment_plans (id, category, badge_title, price, daily_income, days, total_income)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        category = excluded.category,
        badge_title = excluded.badge_title,
        price = excluded.price,
        daily_income = excluded.daily_income,
        days = excluded.days,
        total_income = excluded.total_income
    `).run(planId, category, badgeTitle, parseFloat(price), parseFloat(dailyIncome), parseInt(days, 10), parseFloat(totalIncome));

    return res.json({ success: true, message: 'Investment plan saved!' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Admin Delete Plan
app.post('/api/admin/plans/delete', (req, res) => {
  try {
    const { id } = req.body;
    db.prepare('UPDATE investment_plans SET is_active = 0 WHERE id = ?').run(id);
    return res.json({ success: true, message: 'Plan removed' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Admin Site Settings GET
app.get('/api/admin/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM site_settings').all() as any[];
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    return res.json({ success: true, settings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Admin Site Settings POST
app.post('/api/admin/settings', (req, res) => {
  try {
    const settings = req.body;
    const insert = db.prepare(`
      INSERT INTO site_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const [k, v] of Object.entries(settings)) {
      insert.run(k, String(v));
    }

    return res.json({ success: true, message: 'Site settings updated!' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    gateway: 'Toing pay',
    database: 'SQLite WAL mode (100k+ users ready)',
    timestamp: new Date().toISOString(),
  });
});

// Start Server & Integrate Vite Middleware
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Toing Express Server + SQLite running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
