import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

// Ensure data directory exists
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.resolve(DATA_DIR, 'toing_database.db');
export const db = new DatabaseSync(DB_PATH);

// High performance PRAGMA for 100k+ users and high concurrent transactions
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA cache_size = -64000;
  PRAGMA temp_store = MEMORY;
`);

// 1. Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    mobile TEXT PRIMARY KEY,
    uid TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    withdrawal_password TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    referred_by TEXT DEFAULT 'D99DE2',
    vip_level INTEGER DEFAULT 1,
    available_balance REAL DEFAULT 25.0,
    total_recharge REAL DEFAULT 0.0,
    total_income REAL DEFAULT 0.0,
    fixed_income REAL DEFAULT 0.0,
    team_recharge REAL DEFAULT 0.0,
    team_size INTEGER DEFAULT 0,
    holder_name TEXT DEFAULT '',
    bank_name TEXT DEFAULT '',
    account_number TEXT DEFAULT '',
    ifsc_code TEXT DEFAULT '',
    upi_id TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
  CREATE INDEX IF NOT EXISTS idx_users_invite ON users(invite_code);
  CREATE INDEX IF NOT EXISTS idx_users_referred ON users(referred_by);

  CREATE TABLE IF NOT EXISTS deposit_orders (
    id TEXT PRIMARY KEY,
    merchant_order_no TEXT UNIQUE NOT NULL,
    order_no TEXT DEFAULT '',
    user_mobile TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_url TEXT DEFAULT '',
    method TEXT DEFAULT 'Toing pay',
    extra TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_deposits_merchant_no ON deposit_orders(merchant_order_no);
  CREATE INDEX IF NOT EXISTS idx_deposits_mobile ON deposit_orders(user_mobile);
  CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposit_orders(status);

  CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id TEXT PRIMARY KEY,
    user_mobile TEXT NOT NULL,
    user_uid TEXT NOT NULL,
    amount REAL NOT NULL,
    bank_name TEXT DEFAULT '',
    holder_name TEXT DEFAULT '',
    account_number TEXT DEFAULT '',
    ifsc_code TEXT DEFAULT '',
    upi_id TEXT DEFAULT '',
    status TEXT DEFAULT 'Pending',
    utr TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_withdrawals_mobile ON withdrawal_requests(user_mobile);
  CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawal_requests(status);

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_mobile TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT DEFAULT '',
    utr TEXT DEFAULT '',
    status TEXT DEFAULT 'Success',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_tx_mobile ON transactions(user_mobile);

  CREATE TABLE IF NOT EXISTS purchased_plans (
    id TEXT PRIMARY KEY,
    user_mobile TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    title TEXT NOT NULL,
    price REAL NOT NULL,
    daily_income REAL NOT NULL,
    days INTEGER NOT NULL,
    total_income REAL NOT NULL,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_plans_mobile ON purchased_plans(user_mobile);

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS investment_plans (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    badge_title TEXT NOT NULL,
    price REAL NOT NULL,
    daily_income REAL NOT NULL,
    days INTEGER NOT NULL,
    total_income REAL NOT NULL,
    is_active INTEGER DEFAULT 1
  );
`);

// 2. Seed Default Demo User if not exists
const checkUser = db.prepare('SELECT mobile FROM users WHERE mobile = ?').get('7667340426');
if (!checkUser) {
  db.prepare(`
    INSERT INTO users (
      mobile, uid, password, withdrawal_password, invite_code, referred_by,
      vip_level, available_balance, total_recharge, total_income, fixed_income,
      team_recharge, team_size
    ) VALUES (
      '7667340426', '79176', 'password123', '123456', 'A3A60B', 'D99DE2',
      1, 25.0, 0.0, 0.0, 0.0, 0.0, 0
    )
  `).run();

  db.prepare(`
    INSERT INTO transactions (id, user_mobile, type, amount, method, utr, status)
    VALUES ('tx-welcome-25', '7667340426', 'Signup Bonus', 25.0, 'Toing Welcome Reward', 'BONUS79176', 'Success')
  `).run();
}

// 3. Seed Default Plans if not seeded
const checkPlans = db.prepare('SELECT count(*) as count FROM investment_plans').get() as { count: number };
if (checkPlans.count === 0) {
  const defaultDailyPlans = [
    { id: 'plan-limited-800', category: 'daily', badge_title: 'LIMITED-TIME OFFER', price: 800, daily_income: 3698, days: 3, total_income: 11094 },
    { id: 'plan-daily-290', category: 'daily', badge_title: 'DAILY INCOME DAILY WITHDRAWAL', price: 290, daily_income: 255, days: 60, total_income: 15300 },
    { id: 'plan-daily-560', category: 'daily', badge_title: 'DAILY INCOME DAILY WITHDRAWAL', price: 560, daily_income: 1428, days: 17, total_income: 24276 },
    { id: 'plan-daily-1400', category: 'daily', badge_title: 'DAILY INCOME DAILY WITHDRAWAL', price: 1400, daily_income: 4218, days: 10, total_income: 42180 },
    { id: 'plan-daily-2300', category: 'daily', badge_title: 'DAILY INCOME DAILY WITHDRAWAL', price: 2300, daily_income: 6370, days: 7, total_income: 44590 },
    { id: 'plan-daily-3300', category: 'daily', badge_title: 'DAILY INCOME DAILY WITHDRAWAL', price: 3300, daily_income: 8800, days: 5, total_income: 44000 },
    { id: 'plan-daily-5000', category: 'daily', badge_title: 'DAILY INCOME DAILY WITHDRAWAL', price: 5000, daily_income: 17650, days: 2, total_income: 35300 },
  ];

  const defaultVipPlans = [
    { id: 'vip-plan-1200', category: 'vip', badge_title: 'VIP-1 EXCLUSIVE WELFARE PLAN', price: 1200, daily_income: 4600, days: 5, total_income: 23000 },
    { id: 'vip-plan-2800', category: 'vip', badge_title: 'VIP-2 DAILY HIGH RETURN', price: 2800, daily_income: 9500, days: 5, total_income: 47500 },
    { id: 'vip-plan-6500', category: 'vip', badge_title: 'VIP-3 PARTNER DIVIDEND PLAN', price: 6500, daily_income: 24500, days: 3, total_income: 73500 },
    { id: 'vip-plan-12000', category: 'vip', badge_title: 'VIP-4 CROWN DELIVERY HUB', price: 12000, daily_income: 52000, days: 2, total_income: 104000 },
  ];

  const insertPlan = db.prepare(`
    INSERT INTO investment_plans (id, category, badge_title, price, daily_income, days, total_income)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of [...defaultDailyPlans, ...defaultVipPlans]) {
    insertPlan.run(p.id, p.category, p.badge_title, p.price, p.daily_income, p.days, p.total_income);
  }
}

// 4. Seed Default Settings
const defaultSettings: Record<string, string> = {
  minWithdrawal: '100',
  minRecharge: '100',
  inviteBonus: '100',
  signupBonus: '25',
  teamCommissionL1: '10',
  teamCommissionL2: '3',
  teamCommissionL3: '2',
  channelUrl: 'https://t.me/+gz_IQSaa0bViODFl',
  customerCareUrl: 'https://t.me/WATCHpay01x',
  welcomeNoticeTitle: 'Official Toing Notice',
  welcomeNoticeBody: 'Welcome to Toing by Swiggy! Food delivery ka naya way. Get ₹100 invite bonus, minimum ₹100 withdrawal, and 10% direct team commission.',
  showWelcomeNotice: 'true',
  gatewayName: 'Toing pay',
};

const insertSetting = db.prepare(`
  INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)
`);

for (const [k, v] of Object.entries(defaultSettings)) {
  insertSetting.run(k, v);
}

console.log('[SQLite Database] Persistent high-performance database ready at', DB_PATH);
