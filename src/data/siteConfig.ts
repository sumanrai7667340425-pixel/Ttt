import { PlanItem, DAILY_PLANS, VIP_PLANS } from './plans';

export interface SiteSettings {
  minWithdrawal: number;
  minRecharge: number;
  inviteBonus: number;
  signupBonus: number;
  teamCommissionL1: number;
  teamCommissionL2: number;
  teamCommissionL3: number;
  channelUrl: string;
  customerCareUrl: string;
  welcomeNoticeTitle: string;
  welcomeNoticeBody: string;
  showWelcomeNotice: boolean;
  gatewayName: string;
}

export interface AdminWithdrawalRequest {
  id: string;
  userMobile: string;
  userUid: string;
  amount: number;
  bankName: string;
  holderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  utr?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminDepositOrder {
  id: string;
  merchantOrderNo: string;
  gatewayOrderNo?: string;
  userMobile: string;
  amount: number;
  status: 'Pending' | 'Success' | 'Failed';
  method: string;
  createdAt: string;
  updatedAt?: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  minWithdrawal: 100,
  minRecharge: 100,
  inviteBonus: 100,
  signupBonus: 25,
  teamCommissionL1: 10,
  teamCommissionL2: 3,
  teamCommissionL3: 2,
  channelUrl: 'https://t.me/+gz_IQSaa0bViODFl',
  customerCareUrl: 'https://t.me/WATCHpay01x',
  welcomeNoticeTitle: 'Official Toing Notice',
  welcomeNoticeBody: 'Welcome to Toing by Swiggy! Food delivery ka naya way. Get ₹100 invite bonus, minimum ₹100 withdrawal, and 10% direct team commission.',
  showWelcomeNotice: true,
  gatewayName: 'Toing pay',
};

export const STORAGE_KEYS = {
  SETTINGS: 'toing_site_settings_v3',
  DAILY_PLANS: 'toing_daily_plans_v3',
  VIP_PLANS: 'toing_vip_plans_v3',
  WITHDRAWALS: 'toing_admin_withdrawals_v3',
  DEPOSITS: 'toing_admin_deposits_v3',
  ADMIN_SESSION: 'toing_admin_session_v3',
  ADMIN_CREDS: 'toing_admin_creds_v3',
};

export function loadStoredSettings(): SiteSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_SITE_SETTINGS;
}

export function saveStoredSettings(settings: SiteSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    // ignore
  }
}

export function loadStoredPlans(): { dailyPlans: PlanItem[]; vipPlans: PlanItem[] } {
  let daily = DAILY_PLANS;
  let vip = VIP_PLANS;

  try {
    const rawDaily = localStorage.getItem(STORAGE_KEYS.DAILY_PLANS);
    if (rawDaily) {
      daily = JSON.parse(rawDaily);
    }
  } catch (e) {
    // fallback
  }

  try {
    const rawVip = localStorage.getItem(STORAGE_KEYS.VIP_PLANS);
    if (rawVip) {
      vip = JSON.parse(rawVip);
    }
  } catch (e) {
    // fallback
  }

  return { dailyPlans: daily, vipPlans: vip };
}

export function saveStoredPlans(dailyPlans: PlanItem[], vipPlans: PlanItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_PLANS, JSON.stringify(dailyPlans));
    localStorage.setItem(STORAGE_KEYS.VIP_PLANS, JSON.stringify(vipPlans));
  } catch (e) {
    // ignore
  }
}

export function loadStoredWithdrawals(): AdminWithdrawalRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WITHDRAWALS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return [];
}

export function saveStoredWithdrawals(requests: AdminWithdrawalRequest[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify(requests));
  } catch (e) {
    // ignore
  }
}

export function loadStoredDeposits(): AdminDepositOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEPOSITS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return [];
}

export function saveStoredDeposits(orders: AdminDepositOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(orders));
  } catch (e) {
    // ignore
  }
}
