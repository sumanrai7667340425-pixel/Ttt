export interface PlanItem {
  id: string;
  category: 'daily' | 'vip';
  badgeTitle: string;
  price: number;
  dailyIncome: number;
  days: number;
  totalIncome: number;
  isLimitedOffer?: boolean;
  initialCountdownSeconds?: number;
}

export interface PurchasedPlan {
  id: string;
  planId: string;
  title: string;
  price: number;
  dailyIncome: number;
  days: number;
  totalIncome: number;
  purchasedAt: string;
  status: 'Active' | 'Completed';
}

export interface TransactionRecord {
  id: string;
  type: 'Recharge' | 'Plan Purchase' | 'Withdrawal' | 'Signup Bonus' | 'Daily Income';
  amount: number;
  method: string;
  utr: string;
  status: 'Success' | 'Pending' | 'Completed';
  timestamp: string;
}

export interface BankDetails {
  holderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
}

export interface TeamMember {
  id: string;
  mobile: string;
  joinedAt: string;
  rechargeAmount: number;
  commissionEarned: number;
}

export interface UserAccount {
  mobile: string;
  uid: string;
  password: string;
  withdrawalPassword: string;
  inviteCode: string;
  referredBy: string;
  vipLevel: number;
  availableBalance: number;
  totalRecharge: number;
  totalIncome: number;
  fixedIncome: number;
  teamRecharge: number;
  teamSize: number;
  bankDetails: BankDetails;
  collections: PurchasedPlan[];
  transactions: TransactionRecord[];
  teamMembers: TeamMember[];
}

export const DAILY_PLANS: PlanItem[] = [
  {
    id: 'plan-limited-800',
    category: 'daily',
    badgeTitle: 'LIMITED-TIME OFFER',
    price: 800,
    dailyIncome: 3698,
    days: 3,
    totalIncome: 11094,
    isLimitedOffer: true,
    initialCountdownSeconds: 8 * 3600 + 18 * 60 + 4, // 08:18:04 as shown in video
  },
  {
    id: 'plan-daily-290',
    category: 'daily',
    badgeTitle: 'DAILY INCOME DAILY WITHDRAWAL',
    price: 290,
    dailyIncome: 255,
    days: 60,
    totalIncome: 15300,
  },
  {
    id: 'plan-daily-560',
    category: 'daily',
    badgeTitle: 'DAILY INCOME DAILY WITHDRAWAL',
    price: 560,
    dailyIncome: 1428,
    days: 17,
    totalIncome: 24276,
  },
  {
    id: 'plan-daily-1400',
    category: 'daily',
    badgeTitle: 'DAILY INCOME DAILY WITHDRAWAL',
    price: 1400,
    dailyIncome: 4218,
    days: 10,
    totalIncome: 42180,
  },
  {
    id: 'plan-daily-2300',
    category: 'daily',
    badgeTitle: 'DAILY INCOME DAILY WITHDRAWAL',
    price: 2300,
    dailyIncome: 6370,
    days: 7,
    totalIncome: 44590,
  },
  {
    id: 'plan-daily-3300',
    category: 'daily',
    badgeTitle: 'DAILY INCOME DAILY WITHDRAWAL',
    price: 3300,
    dailyIncome: 8800,
    days: 5,
    totalIncome: 44000,
  },
  {
    id: 'plan-daily-5000',
    category: 'daily',
    badgeTitle: 'DAILY INCOME DAILY WITHDRAWAL',
    price: 5000,
    dailyIncome: 17650,
    days: 2,
    totalIncome: 35300,
  },
];

export const VIP_PLANS: PlanItem[] = [
  {
    id: 'vip-plan-1200',
    category: 'vip',
    badgeTitle: 'VIP-1 EXCLUSIVE WELFARE PLAN',
    price: 1200,
    dailyIncome: 4600,
    days: 5,
    totalIncome: 23000,
    isLimitedOffer: true,
    initialCountdownSeconds: 6 * 3600 + 42 * 60 + 19,
  },
  {
    id: 'vip-plan-2800',
    category: 'vip',
    badgeTitle: 'VIP-2 DAILY HIGH RETURN',
    price: 2800,
    dailyIncome: 9500,
    days: 5,
    totalIncome: 47500,
  },
  {
    id: 'vip-plan-6500',
    category: 'vip',
    badgeTitle: 'VIP-3 PARTNER DIVIDEND PLAN',
    price: 6500,
    dailyIncome: 24500,
    days: 3,
    totalIncome: 73500,
  },
  {
    id: 'vip-plan-12000',
    category: 'vip',
    badgeTitle: 'VIP-4 CROWN DELIVERY HUB',
    price: 12000,
    dailyIncome: 52000,
    days: 2,
    totalIncome: 104000,
  },
];

export function formatINR(value: number): string {
  return '₹' + value.toLocaleString('en-IN');
}
