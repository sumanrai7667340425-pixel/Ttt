/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  UserPlus,
  Bike,
  Share,
  Users,
  UserCircle,
  Headphones,
  Send,
  Copy,
  Zap,
  Upload,
  ChevronRight,
  CreditCard,
  Layers,
  ReceiptText,
  LogOut,
  Crown,
  IndianRupee,
  Wallet,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  DAILY_PLANS,
  VIP_PLANS,
  PlanItem,
  UserAccount,
  BankDetails,
  formatINR,
} from './data/plans';
import { PaymentGatewayModal } from './components/PaymentGatewayModal';
import { AdminPanel } from './components/AdminPanel';
import {
  WelcomeModal,
  WithdrawModal,
  BankAccountModal,
  CollectionsModal,
  TransactionsModal,
  InfoSheetModal,
} from './components/Modals';
import {
  SiteSettings,
  DEFAULT_SITE_SETTINGS,
} from './data/siteConfig';

const CURRENT_USER_KEY = 'toing_swiggy_current_mobile_v4';

const DEFAULT_DEMO_USER: UserAccount = {
  mobile: '7667340426',
  uid: '79176',
  password: 'password123',
  withdrawalPassword: '123456',
  inviteCode: 'A3A60B',
  referredBy: 'D99DE2',
  vipLevel: 1,
  availableBalance: 25,
  totalRecharge: 0,
  totalIncome: 0,
  fixedIncome: 0,
  teamRecharge: 0,
  teamSize: 0,
  bankDetails: {
    holderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
  },
  collections: [],
  transactions: [
    {
      id: 'tx-welcome-25',
      type: 'Signup Bonus',
      amount: 25,
      method: 'Toing Welcome Reward',
      utr: 'BONUS79176',
      status: 'Success',
      timestamp: '2026-11-02 15:41',
    },
  ],
  teamMembers: [],
};

export default function App() {
  // Live Site Settings from Server SQLite Database
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  // Live Investment Plans from Server SQLite Database
  const [dailyPlansList, setDailyPlansList] = useState<PlanItem[]>(DAILY_PLANS);
  const [vipPlansList, setVipPlansList] = useState<PlanItem[]>(VIP_PLANS);

  // Current Logged In User Mobile
  const [currentUserMobile, setCurrentUserMobile] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CURRENT_USER_KEY);
    } catch {
      return null;
    }
  });

  // Current Live User Profile Data from Server
  const [currentUser, setCurrentUser] = useState<UserAccount>(DEFAULT_DEMO_USER);

  // Auth screen state (Starts on 'register' tab)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('register');

  // Register inputs
  const [regMobile, setRegMobile] = useState('');
  const [regLoginPwd, setRegLoginPwd] = useState('');
  const [regConfirmPwd, setRegConfirmPwd] = useState('');
  const [regWithdrawPwd, setRegWithdrawPwd] = useState('');
  const [regInviteCode, setRegInviteCode] = useState('D99DE2');
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showRegConfirmPwd, setShowRegConfirmPwd] = useState(false);
  const [showRegWithdrawPwd, setShowRegWithdrawPwd] = useState(false);

  // Login inputs
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Main navigation tab ('home' | 'share' | 'team' | 'my')
  const [activeBottomTab, setActiveBottomTab] = useState<'home' | 'share' | 'team' | 'my'>('home');
  const [planTab, setPlanTab] = useState<'daily' | 'vip'>('daily');

  // Modals & Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);

  // PAYMENT GATEWAY MODAL: Opens ONLY on Recharge and Deposit!
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentInitialAmount, setPaymentInitialAmount] = useState<number>(800);

  // Admin Master Control Panel: Hidden from regular users, opens via URL #admin or secret gesture
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [vipTapCount, setVipTapCount] = useState(0);

  // Insufficient Balance Dialog for Plan Activation
  const [insufficientPlan, setInsufficientPlan] = useState<PlanItem | null>(null);

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);
  const [infoSheetType, setInfoSheetType] = useState<'online' | 'channel' | 'customercare' | null>(null);

  // Dynamic Site Origin for Live Share/Referral Link
  const [currentOrigin, setCurrentOrigin] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Fetch Live Server User Profile
  const fetchLiveUserProfile = async (mobile: string) => {
    try {
      const res = await fetch(`/api/user/${mobile}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        }
      } else if (res.status === 404) {
        // User does not exist in centralized database, reset session cleanly
        setCurrentUserMobile(null);
        try {
          localStorage.removeItem(CURRENT_USER_KEY);
        } catch {}
      }
    } catch (e) {
      console.error('Error fetching live user profile:', e);
    }
  };

  // Fetch Live Server Settings and Plans
  const fetchServerSettingsAndPlans = async () => {
    try {
      const setRes = await fetch('/api/admin/settings');
      if (setRes.ok) {
        const setData = await setRes.json();
        if (setData.success && setData.settings) {
          setSiteSettings((prev) => ({
            ...prev,
            minWithdrawal: parseFloat(setData.settings.minWithdrawal) || 100,
            minRecharge: parseFloat(setData.settings.minRecharge) || 100,
            inviteBonus: parseFloat(setData.settings.inviteBonus) || 100,
            signupBonus: parseFloat(setData.settings.signupBonus) || 25,
            teamCommissionL1: parseFloat(setData.settings.teamCommissionL1) || 10,
            channelUrl: setData.settings.channelUrl || prev.channelUrl,
            customerCareUrl: setData.settings.customerCareUrl || prev.customerCareUrl,
            welcomeNoticeTitle: setData.settings.welcomeNoticeTitle || prev.welcomeNoticeTitle,
            welcomeNoticeBody: setData.settings.welcomeNoticeBody || prev.welcomeNoticeBody,
          }));
        }
      }

      const planRes = await fetch('/api/admin/plans');
      if (planRes.ok) {
        const planData = await planRes.json();
        if (planData.success && Array.isArray(planData.plans) && planData.plans.length > 0) {
          const daily = planData.plans
            .filter((p: any) => p.category === 'daily')
            .map((p: any) => ({
              id: p.id,
              category: 'daily' as const,
              badgeTitle: p.badge_title,
              price: p.price,
              dailyIncome: p.daily_income,
              days: p.days,
              totalIncome: p.total_income,
            }));
          const vip = planData.plans
            .filter((p: any) => p.category === 'vip')
            .map((p: any) => ({
              id: p.id,
              category: 'vip' as const,
              badgeTitle: p.badge_title,
              price: p.price,
              dailyIncome: p.daily_income,
              days: p.days,
              totalIncome: p.total_income,
            }));
          if (daily.length > 0) setDailyPlansList(daily);
          if (vip.length > 0) setVipPlansList(vip);
        }
      }
    } catch (e) {
      console.error('Error fetching settings/plans from server:', e);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
      // Auto-populate invite code if URL contains ?ref=CODE
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        setRegInviteCode(ref.toUpperCase());
        setAuthTab('register');
      }

      // Check if URL contains #admin to open Admin Panel
      if (window.location.hash === '#admin') {
        setIsAdminOpen(true);
      }

      window.addEventListener('hashchange', () => {
        if (window.location.hash === '#admin') {
          setIsAdminOpen(true);
        }
      });
    }

    fetchServerSettingsAndPlans();
  }, []);

  useEffect(() => {
    if (currentUserMobile) {
      try {
        localStorage.setItem(CURRENT_USER_KEY, currentUserMobile);
      } catch {}
      fetchLiveUserProfile(currentUserMobile);
    } else {
      try {
        localStorage.removeItem(CURRENT_USER_KEY);
      } catch {}
    }
  }, [currentUserMobile]);

  // Secret Admin Access via Tapping VIP Badge 5 times
  const handleVipBadgeTap = () => {
    const next = vipTapCount + 1;
    setVipTapCount(next);
    if (next >= 5) {
      setVipTapCount(0);
      setIsAdminOpen(true);
      showToast('Admin verification prompt opened');
    }
  };

  // 1. Handle Register (Saves to Centralized Server SQLite Database)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedMobile = regMobile.replace(/\D/g, '');

    if (cleanedMobile.length !== 10) {
      showToast('कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें');
      return;
    }
    if (!regLoginPwd || regLoginPwd.length < 6) {
      showToast('लॉगिन पासवर्ड कम से कम 6 अक्षरों का होना चाहिए');
      return;
    }
    if (regLoginPwd !== regConfirmPwd) {
      showToast('पासवर्ड मेल नहीं खा रहे हैं! कृपया दोबारा जांचें');
      return;
    }
    if (!regWithdrawPwd || regWithdrawPwd.length < 6) {
      showToast('निकासी पासवर्ड कम से कम 6 अंकों का होना चाहिए');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: cleanedMobile,
          password: regLoginPwd,
          withdrawalPassword: regWithdrawPwd,
          inviteCode: regInviteCode,
          referredBy: regInviteCode,
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUserMobile(cleanedMobile);
        setCurrentUser(data.user);
        setActiveBottomTab('home');
        showToast('रजिस्ट्रेशन सफल! Welcome to Toing');
        setIsWelcomeOpen(true);
      } else {
        showToast(data.message || 'Registration failed');
        if (data.message && data.message.includes('पहले से रजिस्टर्ड')) {
          setAuthTab('login');
          setLoginMobile(cleanedMobile);
        }
      }
    } catch (err: any) {
      showToast('Network error during registration');
    }
  };

  // 2. Handle Login (Authenticates against Server SQLite Database)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedMobile = loginMobile.replace(/\D/g, '');
    if (cleanedMobile.length !== 10) {
      showToast('कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें');
      return;
    }
    if (!loginPwd) {
      showToast('कृपया पासवर्ड दर्ज करें');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: cleanedMobile,
          password: loginPwd,
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUserMobile(cleanedMobile);
        setCurrentUser(data.user);
        setActiveBottomTab('home');
        showToast('Login successful');
        setIsWelcomeOpen(true);
        fetchLiveUserProfile(cleanedMobile);
      } else {
        showToast(data.message || 'Login failed');
      }
    } catch {
      showToast('Server communication error');
    }
  };

  // 3. Handle Recharge / Deposit Completion via Toing pay Gateway
  const handleDepositSuccess = (amount: number, method: string, utr: string) => {
    if (currentUserMobile) {
      fetchLiveUserProfile(currentUserMobile);
    }
    showToast(`Recharge of ₹${amount} successful via Toing pay!`);
  };

  // 4. Handle Plan Purchase (Buy now) - Directly from Wallet Balance
  const handleBuyPlan = async (plan: PlanItem) => {
    if (currentUser.availableBalance >= plan.price) {
      try {
        const res = await fetch('/api/plans/buy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile: currentUser.mobile,
            planId: plan.id,
            price: plan.price,
            title: plan.badgeTitle,
            dailyIncome: plan.dailyIncome,
            days: plan.days,
            totalIncome: plan.totalIncome,
          }),
        });

        const data = await res.json();
        if (data.success) {
          fetchLiveUserProfile(currentUser.mobile);
          showToast(`🎉 ${plan.badgeTitle} एक्टिवेट हो गया है!`);
        } else {
          showToast(data.message || 'Error buying plan');
        }
      } catch {
        showToast('Server error while activating plan');
      }
    } else {
      setInsufficientPlan(plan);
    }
  };

  // 5. Open Payment Gateway - ONLY CALLED ON RECHARGE OR DEPOSIT!
  const openRechargeGateway = (defaultAmt = 800) => {
    setPaymentInitialAmount(defaultAmt);
    setIsPaymentOpen(true);
  };

  // Handle Claim Daily Income
  const handleClaimDailyIncome = async (collectionId: string) => {
    try {
      const res = await fetch('/api/plans/claim-income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: currentUser.mobile,
          collectionId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchLiveUserProfile(currentUser.mobile);
        showToast(data.message || 'Daily income credited!');
      } else {
        showToast(data.message || 'Claim failed');
      }
    } catch {
      showToast('Server error claiming income');
    }
  };

  // Handle Withdrawal
  const handleWithdraw = async (amount: number, withdrawPwd: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: currentUser.mobile,
          amount,
          withdrawPassword: withdrawPwd,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchLiveUserProfile(currentUser.mobile);
        showToast(data.message || 'Withdrawal submitted!');
        return true;
      } else {
        showToast(data.message || 'Withdrawal failed');
        return false;
      }
    } catch {
      showToast('Server error processing withdrawal');
      return false;
    }
  };

  const handleSaveBankDetails = async (details: BankDetails) => {
    try {
      const res = await fetch('/api/user/bank-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: currentUser.mobile,
          ...details,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLiveUserProfile(currentUser.mobile);
        showToast('Bank details saved to server');
      }
    } catch {
      showToast('Error saving bank details');
    }
  };

  // Dynamic Real Referral Invite Link
  const shareUrl = currentOrigin
    ? `${currentOrigin}/?ref=${currentUser.inviteCode}`
    : `https://toing.app/?ref=${currentUser.inviteCode}`;

  return (
    <div className="min-h-screen bg-[#e8ece9] flex justify-center">
      {/* Main Mobile Container */}
      <div className="w-full max-w-[430px] min-h-screen bg-[#f3f6f4] relative shadow-2xl flex flex-col overflow-x-hidden">
        {/* Floating Green Toast */}
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-[#28a745] text-white px-6 py-2.5 rounded-xl shadow-[0_8px_24px_rgba(40,167,69,0.45)] font-semibold text-[15px] tracking-wide whitespace-nowrap animate-in fade-in slide-in-from-top-3 duration-150">
            {toastMessage}
          </div>
        )}

        {/* ==================== AUTH VIEW (REGISTER / LOGIN) ==================== */}
        {!currentUserMobile ? (
          <div className="flex-1 bg-white flex flex-col">
            {/* Top Video Banner */}
            <div className="relative w-full bg-[#046121] overflow-hidden select-none">
              <img
                src="/assets/extracted/auth_banner_full.png"
                alt="Toing by Swiggy Fast Delivery"
                referrerPolicy="no-referrer"
                className="w-full h-[215px] sm:h-[225px] object-cover object-top block"
              />
            </div>

            {/* White Rounded Top Sheet + Overlapping Circular Toing Logo */}
            <div className="relative bg-white rounded-t-[42px] -mt-9 pt-14 px-6 pb-10 flex-1 z-10">
              <div className="w-[94px] h-[94px] rounded-full bg-[#007e29] border-[4px] border-white shadow-[0_6px_18px_rgba(0,0,0,0.18)] absolute -top-[47px] left-1/2 -translate-x-1/2 overflow-hidden flex items-center justify-center">
                <img
                  src="/assets/extracted/toing_logo.png"
                  alt="Toing by Swiggy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover scale-105"
                />
              </div>

              {/* Login / Register Switch Tabs */}
              <div className="grid grid-cols-2 text-center mb-6">
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className="flex flex-col items-center justify-center cursor-pointer py-1"
                >
                  <span
                    className={`text-[19px] transition-colors ${
                      authTab === 'login'
                        ? 'font-extrabold text-[#111827]'
                        : 'font-semibold text-[#9ca3af]'
                    }`}
                  >
                    Login
                  </span>
                  <div
                    className={`h-[3.5px] w-14 rounded-full mt-1.5 transition-all ${
                      authTab === 'login' ? 'bg-[#198737]' : 'bg-transparent'
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setAuthTab('register')}
                  className="flex flex-col items-center justify-center cursor-pointer py-1"
                >
                  <span
                    className={`text-[19px] transition-colors ${
                      authTab === 'register'
                        ? 'font-extrabold text-[#111827]'
                        : 'font-semibold text-[#9ca3af]'
                    }`}
                  >
                    Register
                  </span>
                  <div
                    className={`h-[3.5px] w-16 rounded-full mt-1.5 transition-all ${
                      authTab === 'register' ? 'bg-[#198737]' : 'bg-transparent'
                    }`}
                  />
                </button>
              </div>

              {/* REGISTER FORM */}
              {authTab === 'register' ? (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="bg-[#f4f5f7] rounded-full h-[54px] px-5 flex items-center border-[1.5px] border-transparent focus-within:border-[#198737] focus-within:bg-white transition-all">
                    <span className="text-[#198737] font-extrabold text-[15.5px] pr-3.5 border-r border-[#d1d5db] select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value)}
                      placeholder="Enter mobile number"
                      className="w-full bg-transparent pl-3.5 text-[15px] font-medium text-[#111827] placeholder-[#9ca3af] focus:outline-none"
                    />
                  </div>

                  <div className="bg-[#f4f5f7] rounded-full h-[54px] px-5 flex items-center border-[1.5px] border-transparent focus-within:border-[#198737] focus-within:bg-white transition-all">
                    <input
                      type={showRegPwd ? 'text' : 'password'}
                      value={regLoginPwd}
                      onChange={(e) => setRegLoginPwd(e.target.value)}
                      placeholder="Enter login password"
                      className="w-full bg-transparent text-[15px] font-medium text-[#111827] placeholder-[#9ca3af] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPwd(!showRegPwd)}
                      className="text-[#9ca3af] hover:text-[#4b5563] pl-2 cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showRegPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="bg-[#f4f5f7] rounded-full h-[54px] px-5 flex items-center border-[1.5px] border-transparent focus-within:border-[#198737] focus-within:bg-white transition-all">
                    <input
                      type={showRegConfirmPwd ? 'text' : 'password'}
                      value={regConfirmPwd}
                      onChange={(e) => setRegConfirmPwd(e.target.value)}
                      placeholder="Confirm login password"
                      className="w-full bg-transparent text-[15px] font-medium text-[#111827] placeholder-[#9ca3af] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPwd(!showRegConfirmPwd)}
                      className="text-[#9ca3af] hover:text-[#4b5563] pl-2 cursor-pointer"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showRegConfirmPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="bg-[#f4f5f7] rounded-full h-[54px] px-5 flex items-center border-[1.5px] border-transparent focus-within:border-[#198737] focus-within:bg-white transition-all">
                    <input
                      type={showRegWithdrawPwd ? 'text' : 'password'}
                      value={regWithdrawPwd}
                      onChange={(e) => setRegWithdrawPwd(e.target.value)}
                      placeholder="Enter withdrawal password (6 digits)"
                      className="w-full bg-transparent text-[15px] font-medium text-[#111827] placeholder-[#9ca3af] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegWithdrawPwd(!showRegWithdrawPwd)}
                      className="text-[#9ca3af] hover:text-[#4b5563] pl-2 cursor-pointer"
                      aria-label="Toggle withdrawal password visibility"
                    >
                      {showRegWithdrawPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="bg-[#f4f5f7] rounded-full h-[54px] px-5 flex items-center border-[1.5px] border-transparent focus-within:border-[#198737] focus-within:bg-white transition-all">
                    <input
                      type="text"
                      value={regInviteCode}
                      onChange={(e) => setRegInviteCode(e.target.value)}
                      placeholder="Enter invitation code"
                      className="w-full bg-transparent text-[15px] font-medium text-[#111827] placeholder-[#9ca3af] uppercase focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full h-[54px] rounded-full bg-gradient-to-b from-[#2eb843] to-[#137a24] text-white font-bold text-[16px] tracking-wider uppercase shadow-[0_8px_20px_rgba(25,135,55,0.35)] btn-primary-animated cursor-pointer"
                    >
                      REGISTER
                    </button>
                  </div>

                  <div className="text-center pt-2 text-[14.5px] text-[#6b7280] font-medium">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthTab('login')}
                      className="text-[#198737] font-bold underline cursor-pointer"
                    >
                      Login
                    </button>
                  </div>
                </form>
              ) : (
                /* LOGIN FORM */
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="bg-[#f4f5f7] rounded-full h-[54px] px-5 flex items-center border-[1.5px] border-transparent focus-within:border-[#198737] focus-within:bg-white transition-all">
                    <span className="text-[#198737] font-extrabold text-[15.5px] pr-3.5 border-r border-[#d1d5db] select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={loginMobile}
                      onChange={(e) => setLoginMobile(e.target.value)}
                      placeholder="Enter mobile number"
                      className="w-full bg-transparent pl-3.5 text-[15px] font-medium text-[#111827] placeholder-[#9ca3af] focus:outline-none"
                    />
                  </div>

                  <div className="bg-[#f4f5f7] rounded-full h-[54px] px-5 flex items-center border-[1.5px] border-transparent focus-within:border-[#198737] focus-within:bg-white transition-all">
                    <input
                      type={showLoginPwd ? 'text' : 'password'}
                      value={loginPwd}
                      onChange={(e) => setLoginPwd(e.target.value)}
                      placeholder="Enter login password"
                      className="w-full bg-transparent text-[15px] font-medium text-[#111827] placeholder-[#9ca3af] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPwd(!showLoginPwd)}
                      className="text-[#9ca3af] hover:text-[#4b5563] pl-2 cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showLoginPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between px-1 pt-0.5">
                    <label className="flex items-center gap-2 text-[13.5px] text-[#6b7280] font-medium cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-[#d1d5db] accent-[#198737]"
                      />
                      Remember me
                    </label>
                    <a
                      href={siteSettings.customerCareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#198737] font-bold text-[13.5px] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </a>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full h-[54px] rounded-full bg-gradient-to-b from-[#2eb843] to-[#137a24] text-white font-bold text-[16px] tracking-wider uppercase shadow-[0_8px_20px_rgba(25,135,55,0.35)] btn-primary-animated cursor-pointer"
                    >
                      LOGIN
                    </button>
                  </div>

                  <div className="text-center pt-2 text-[14.5px] text-[#6b7280] font-medium">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthTab('register')}
                      className="text-[#198737] font-bold underline cursor-pointer"
                    >
                      Register
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* ==================== AUTHENTICATED MAIN PORTAL ==================== */
          <>
            <div className="flex-1 pb-24">
              {/* -------------------- TAB 1: HOME -------------------- */}
              {activeBottomTab === 'home' && (
                <div>
                  {/* Top Hero Banner */}
                  <div className="mx-3 mt-3 rounded-2xl overflow-hidden shadow-xs relative bg-[#032610]">
                    <img
                      src="/assets/extracted/home_banner.png"
                      alt="Toing by Swiggy - Next Shop. Next Level Delivery."
                      referrerPolicy="no-referrer"
                      className="w-full h-auto block object-cover"
                    />
                  </div>

                  {/* 4 Quick Action Buttons: Recharge | Withdraw | Online | Channel */}
                  <div className="grid grid-cols-4 gap-2.5 mx-3 mt-3">
                    {/* 1. Recharge Button - OPENS DIRECT TOING PAY GATEWAY */}
                    <button
                      type="button"
                      onClick={() => openRechargeGateway(800)}
                      className="bg-white rounded-2xl py-3 px-1 flex flex-col items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#edf2ee] cursor-pointer btn-quick-animated"
                    >
                      <div className="w-10 h-10 rounded-full border-2 border-[#198737] text-[#198737] flex items-center justify-center mb-1.5 icon-bounce">
                        <IndianRupee className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <span className="text-[12.5px] font-semibold text-[#374151]">Recharge</span>
                    </button>

                    {/* 2. Withdrawal Button */}
                    <button
                      type="button"
                      onClick={() => setIsWithdrawOpen(true)}
                      className="bg-white rounded-2xl py-3 px-1 flex flex-col items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#edf2ee] cursor-pointer btn-quick-animated"
                    >
                      <div className="w-10 h-10 rounded-xl text-[#198737] flex items-center justify-center mb-1.5 icon-bounce">
                        <CreditCard className="w-7 h-7 stroke-[2]" />
                      </div>
                      <span className="text-[12.5px] font-semibold text-[#374151]">Withdraw</span>
                    </button>

                    {/* 3. Online Button */}
                    <a
                      href={siteSettings.customerCareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-2xl py-3 px-1 flex flex-col items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#edf2ee] cursor-pointer btn-quick-animated text-decoration-none"
                    >
                      <div className="w-10 h-10 rounded-xl text-[#198737] flex items-center justify-center mb-1.5 icon-bounce">
                        <Headphones className="w-7 h-7 stroke-[2]" />
                      </div>
                      <span className="text-[12.5px] font-semibold text-[#374151]">Online</span>
                    </a>

                    {/* 4. Channel Button */}
                    <a
                      href={siteSettings.channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-2xl py-3 px-1 flex flex-col items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#edf2ee] cursor-pointer btn-quick-animated text-decoration-none"
                    >
                      <div className="w-10 h-10 rounded-xl text-[#198737] flex items-center justify-center mb-1.5 icon-bounce">
                        <Send className="w-6 h-6 stroke-[2]" />
                      </div>
                      <span className="text-[12.5px] font-semibold text-[#374151]">Channel</span>
                    </a>
                  </div>

                  {/* Plan Category Tabs: Daily Income Plan | VIP-Plan */}
                  <div className="mx-3 mt-3.5 bg-white rounded-2xl pt-3 pb-2 px-4 grid grid-cols-2 text-center shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#edf2ee]">
                    <button
                      type="button"
                      onClick={() => setPlanTab('daily')}
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <span
                        className={`text-[15px] ${
                          planTab === 'daily'
                            ? 'font-extrabold text-[#198737]'
                            : 'font-semibold text-[#6b7280]'
                        }`}
                      >
                        Daily Income Plan
                      </span>
                      <div
                        className={`h-[3.5px] w-28 rounded-full mt-2 transition-all ${
                          planTab === 'daily' ? 'bg-[#198737]' : 'bg-transparent'
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPlanTab('vip')}
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <span
                        className={`text-[15px] ${
                          planTab === 'vip'
                            ? 'font-extrabold text-[#198737]'
                            : 'font-semibold text-[#6b7280]'
                        }`}
                      >
                        VIP-Plan
                      </span>
                      <div
                        className={`h-[3.5px] w-20 rounded-full mt-2 transition-all ${
                          planTab === 'vip' ? 'bg-[#198737]' : 'bg-transparent'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Plans Feed */}
                  <div className="mx-3 mt-3.5 space-y-4">
                    {(planTab === 'daily' ? dailyPlansList : vipPlansList).map((plan) => (
                      <div
                        key={plan.id}
                        className="bg-white rounded-[22px] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-[#edf2ee]"
                      >
                        <div className="text-center mb-3">
                          <h3 className="text-[#198737] font-extrabold text-[16px] tracking-wide uppercase">
                            {plan.badgeTitle}
                          </h3>
                          <div className="h-[2px] w-44 bg-gradient-to-r from-transparent via-[#198737]/40 to-transparent mx-auto mt-1" />
                        </div>

                        <div className="rounded-xl overflow-hidden bg-[#0a681e]">
                          <img
                            src="/assets/extracted/plan_card_banner.png"
                            alt="Food Delivery Ka Naya Way"
                            referrerPolicy="no-referrer"
                            className="w-full h-auto block object-cover"
                          />
                        </div>

                        <div className="grid grid-cols-4 text-center py-3.5">
                          <div>
                            <div className="text-[#198737] font-extrabold text-[17.5px] tabular-nums">
                              {formatINR(plan.price)}
                            </div>
                            <div className="text-[#6b7280] text-[12px] font-medium mt-0.5">Price</div>
                          </div>
                          <div>
                            <div className="text-[#198737] font-extrabold text-[17.5px] tabular-nums">
                              {formatINR(plan.dailyIncome)}
                            </div>
                            <div className="text-[#6b7280] text-[12px] font-medium mt-0.5">Daily</div>
                          </div>
                          <div>
                            <div className="text-[#198737] font-extrabold text-[17.5px] tabular-nums">
                              {plan.days}
                            </div>
                            <div className="text-[#6b7280] text-[12px] font-medium mt-0.5">Days</div>
                          </div>
                          <div>
                            <div className="text-[#198737] font-extrabold text-[17.5px] tabular-nums">
                              {formatINR(plan.totalIncome)}
                            </div>
                            <div className="text-[#6b7280] text-[12px] font-medium mt-0.5">Total</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleBuyPlan(plan)}
                          className="w-full h-[48px] rounded-full bg-gradient-to-b from-[#2eb843] to-[#137a24] text-white font-bold text-[15.5px] shadow-[0_4px_12px_rgba(25,135,55,0.3)] btn-primary-animated cursor-pointer"
                        >
                          Buy now ({formatINR(plan.price)})
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* -------------------- TAB 2: SHARE -------------------- */}
              {activeBottomTab === 'share' && (
                <div className="min-h-[82vh] bg-white flex flex-col">
                  <div className="bg-[#29a339] h-[52px] flex items-center justify-center text-white font-bold text-[18px] shadow-xs">
                    Share
                  </div>

                  <div className="w-full bg-[#0a681e]">
                    <img
                      src="/assets/extracted/plan_card_banner.png"
                      alt="Food Delivery Ka Naya Way"
                      referrerPolicy="no-referrer"
                      className="w-full h-auto block object-cover"
                    />
                  </div>

                  <div className="p-4 space-y-4 flex-1">
                    <div>
                      <div className="text-[11.5px] font-bold text-[#6b7280] uppercase tracking-wider mb-1.5">
                        Your Unique Referral Link
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                        <div className="text-[13px] font-semibold text-[#1f2937] break-all leading-snug">
                          {shareUrl}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(shareUrl);
                            showToast('Referral link copied!');
                          }}
                          className="bg-[#28a745] hover:bg-[#218838] text-white font-bold text-[14px] px-5 py-2.5 rounded-full shrink-0 shadow-xs btn-primary-animated cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11.5px] font-bold text-[#6b7280] uppercase tracking-wider mb-1.5">
                        Your Invite Code
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                        <div className="text-[19px] font-extrabold text-[#111827] tracking-wide pl-1">
                          {currentUser.inviteCode}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(currentUser.inviteCode);
                            showToast('Invite code copied!');
                          }}
                          className="bg-[#28a745] hover:bg-[#218838] text-white font-bold text-[14px] px-5 py-2.5 rounded-full shrink-0 shadow-xs btn-primary-animated cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <h3 className="text-center text-[#198737] font-bold text-[16.5px] mb-3">
                        Invite Commission
                      </h3>
                      <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl px-4 py-4 flex items-center justify-between">
                        <span className="text-[#1f2937] font-semibold text-[15.5px]">
                          Direct Referral Bonus
                        </span>
                        <span className="text-[#198737] font-extrabold text-[17.5px]">
                          ₹{siteSettings.inviteBonus || 100} + {siteSettings.teamCommissionL1 || 10}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------- TAB 3: TEAM ("My Team") -------------------- */}
              {activeBottomTab === 'team' && (
                <div className="min-h-[82vh] flex flex-col">
                  <div className="bg-gradient-to-b from-[#2eb843] to-[#219631] pt-4 pb-14 px-4 text-center">
                    <h2 className="text-white font-bold text-[18px]">My Team</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-3 px-4 -mt-9">
                    <div className="bg-white rounded-2xl p-4 shadow-[0_4px_14px_rgba(0,0,0,0.05)] border border-[#edf2ee]">
                      <div className="text-[#6b7280] font-bold text-[11px] uppercase tracking-wider">
                        TEAM RECHARGE
                      </div>
                      <div className="text-[#111827] font-extrabold text-[24px] mt-1 tabular-nums">
                        {formatINR(currentUser.teamRecharge)}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-[0_4px_14px_rgba(0,0,0,0.05)] border border-[#edf2ee]">
                      <div className="text-[#6b7280] font-bold text-[11px] uppercase tracking-wider">
                        TEAM SIZE
                      </div>
                      <div className="text-[#111827] font-extrabold text-[24px] mt-1 tabular-nums">
                        {currentUser.teamSize}
                      </div>
                    </div>
                  </div>

                  <div className="mx-4 mt-3.5 bg-white rounded-2xl p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#edf2ee] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#eaf7ec] text-[#198737] flex items-center justify-center">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[#6b7280] text-[10px] font-bold uppercase tracking-wider">
                          YOUR INVITE CODE
                        </div>
                        <div className="text-[#111827] font-extrabold text-[16.5px] tracking-wide">
                          {currentUser.inviteCode}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(currentUser.inviteCode);
                        showToast('Invite code copied!');
                      }}
                      className="bg-[#198737] hover:bg-[#146c2b] text-white font-bold text-[13px] px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-xs btn-primary-animated cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                  </div>

                  <div className="mx-4 mt-3.5 bg-gradient-to-r from-[#2eb843] to-[#198737] rounded-2xl p-4 text-white flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-extrabold text-[15.5px]">Level 1 Team</div>
                        <div className="text-white/90 text-[12px] font-medium">
                          {siteSettings.teamCommissionL1 || 10}% commission • {currentUser.teamSize} members
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/80 text-[10px] font-bold uppercase tracking-wider">
                        RECHARGE
                      </div>
                      <div className="font-extrabold text-[20px] tabular-nums">
                        {formatINR(currentUser.teamRecharge)}
                      </div>
                    </div>
                  </div>

                  <div className="mx-4 mt-6 p-8 bg-white rounded-2xl border border-[#edf2ee] flex flex-col items-center justify-center text-center shadow-2xs">
                    <div className="w-16 h-16 rounded-full bg-[#f8fafc] flex items-center justify-center text-[#9ca3af] mb-3">
                      <svg width="36" height="36" viewBox="0 0 64 64" fill="none">
                        <circle cx="32" cy="22" r="12" stroke="currentColor" strokeWidth="4" />
                        <path
                          d="M10 54C10 44 18 38 32 38C46 38 54 44 54 54"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <p className="text-[#9ca3af] text-[14.5px] font-medium">No team members yet</p>
                  </div>
                </div>
              )}

              {/* -------------------- TAB 4: PROFILE ("My") -------------------- */}
              {activeBottomTab === 'my' && (
                <div>
                  <div className="bg-gradient-to-b from-[#2eb843] to-[#1e8c30] pt-5 pb-14 px-5">
                    <div className="flex items-center gap-4">
                      {/* Left Square Logo + VIP Badge with Secret Admin Gesture */}
                      <div className="relative shrink-0">
                        <div className="w-[70px] h-[70px] rounded-2xl bg-[#007e29] border-2 border-white/80 shadow-md overflow-hidden flex items-center justify-center">
                          <img
                            src="/assets/extracted/toing_logo.png"
                            alt="Toing Logo"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover scale-105"
                          />
                        </div>
                        {/* Discreet tapping gesture on VIP badge triggers Admin verification */}
                        <button
                          type="button"
                          onClick={handleVipBadgeTap}
                          className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5 whitespace-nowrap cursor-pointer select-none"
                          title="VIP Level"
                        >
                          <Crown className="w-3 h-3 fill-current" /> VIP{currentUser.vipLevel}
                        </button>
                      </div>

                      <div>
                        <div className="text-white font-extrabold text-[23px] tracking-tight leading-tight tabular-nums">
                          {currentUser.mobile}
                        </div>
                        <div className="mt-1.5 inline-block bg-white/20 text-white text-[12px] font-semibold px-3 py-0.5 rounded-full">
                          UID: {currentUser.uid}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Available Balance Card - PAY OPTION REMOVED AS REQUESTED */}
                  <div className="mx-4 -mt-9 bg-white rounded-3xl p-5 shadow-[0_6px_20px_rgba(0,0,0,0.05)] border border-[#edf2ee]">
                    <div>
                      <div className="text-[#6b7280] text-[11px] font-bold uppercase tracking-wider">
                        AVAILABLE BALANCE
                      </div>
                      <div className="text-[#198737] font-extrabold text-[32px] leading-tight mt-0.5 tabular-nums">
                        {formatINR(currentUser.availableBalance)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {/* Deposit Button - OPENS DIRECT TOING PAY GATEWAY */}
                      <button
                        type="button"
                        onClick={() => openRechargeGateway(800)}
                        className="h-[46px] rounded-xl bg-gradient-to-r from-[#2eb843] to-[#198737] text-white font-bold text-[14.5px] flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(25,135,55,0.25)] cursor-pointer btn-balance-action"
                      >
                        <Zap className="w-4 h-4 fill-current" />
                        Deposit
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsWithdrawOpen(true)}
                        className="h-[46px] rounded-xl bg-[#eaf7ec] border border-[#bbf7d0] text-[#198737] font-bold text-[14.5px] flex items-center justify-center gap-1.5 cursor-pointer btn-balance-action"
                      >
                        <Upload className="w-4 h-4 stroke-[2.5]" />
                        Withdraw
                      </button>
                    </div>

                    <div className="grid grid-cols-3 border-t border-[#f1f5f9] mt-4 pt-3.5 text-center divide-x divide-[#f1f5f9]">
                      <div>
                        <div className="font-extrabold text-[16px] text-[#111827] tabular-nums">
                          {formatINR(currentUser.totalRecharge)}
                        </div>
                        <div className="text-[10px] font-bold text-[#6b7280] uppercase mt-0.5">
                          RECHARGE
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-[16px] text-[#111827] tabular-nums">
                          {formatINR(currentUser.totalIncome)}
                        </div>
                        <div className="text-[10px] font-bold text-[#6b7280] uppercase mt-0.5">
                          TOTAL INCOME
                        </div>
                      </div>
                      <div>
                        <div className="font-extrabold text-[16px] text-[#111827] tabular-nums">
                          {formatINR(currentUser.fixedIncome)}
                        </div>
                        <div className="text-[10px] font-bold text-[#6b7280] uppercase mt-0.5">
                          FIXED INCOME
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions List (Admin Master Panel REMOVED from user UI as requested) */}
                  <div className="mx-4 mt-5 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-5 h-5 rounded-full bg-[#eaf7ec] text-[#198737] flex items-center justify-center">
                        <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                      <h3 className="text-[#111827] font-extrabold text-[15.5px]">Quick Actions</h3>
                    </div>

                    <div className="space-y-2.5">
                      {/* 1. Account Information */}
                      <button
                        type="button"
                        onClick={() => setIsBankOpen(true)}
                        className="w-full bg-white rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#edf2ee] flex items-center justify-between text-left cursor-pointer hover:border-[#198737]/30 transition-all hover:scale-[1.01] active:scale-98"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-[#eaf7ec] text-[#198737] flex items-center justify-center shrink-0">
                            <Wallet className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-[14.5px] text-[#111827]">
                              Account Information
                            </div>
                            <div className="text-[12px] text-[#6b7280] mt-0.5">
                              Bank & account details
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#9ca3af]" />
                      </button>

                      {/* 2. My Collections */}
                      <button
                        type="button"
                        onClick={() => setIsCollectionsOpen(true)}
                        className="w-full bg-white rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#edf2ee] flex items-center justify-between text-left cursor-pointer hover:border-[#198737]/30 transition-all hover:scale-[1.01] active:scale-98"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-[#eaf7ec] text-[#198737] flex items-center justify-center shrink-0">
                            <Layers className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-[14.5px] text-[#111827]">
                              My Collections
                            </div>
                            <div className="text-[12px] text-[#6b7280] mt-0.5">
                              Your active plans & subscriptions
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#9ca3af]" />
                      </button>

                      {/* 3. Transaction Details */}
                      <button
                        type="button"
                        onClick={() => setIsTransactionsOpen(true)}
                        className="w-full bg-white rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#edf2ee] flex items-center justify-between text-left cursor-pointer hover:border-[#198737]/30 transition-all hover:scale-[1.01] active:scale-98"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-[#eaf7ec] text-[#198737] flex items-center justify-center shrink-0">
                            <ReceiptText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-[14.5px] text-[#111827]">
                              Transaction Details
                            </div>
                            <div className="text-[12px] text-[#6b7280] mt-0.5">
                              Track your transactions history
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#9ca3af]" />
                      </button>

                      {/* 4. Customer Care */}
                      <a
                        href={siteSettings.customerCareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-white rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#edf2ee] flex items-center justify-between text-left cursor-pointer hover:border-[#198737]/50 transition-all hover:scale-[1.01] active:scale-98 text-decoration-none"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-[#eaf7ec] text-[#198737] flex items-center justify-center shrink-0">
                            <Headphones className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-[14.5px] text-[#111827] flex items-center gap-1.5">
                              Customer Care
                              <ExternalLink className="w-3.5 h-3.5 text-[#198737]" />
                            </div>
                            <div className="text-[12px] text-[#6b7280] mt-0.5">
                              24x7 Support & Help Desk
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#9ca3af]" />
                      </a>

                      {/* 5. Logout */}
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentUserMobile(null);
                          setAuthTab('login');
                          showToast('Logged out successfully');
                        }}
                        className="w-full bg-white rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#edf2ee] flex items-center justify-between text-left cursor-pointer hover:border-red-200 transition-all hover:scale-[1.01] active:scale-98"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-[#eaf7ec] text-[#198737] flex items-center justify-center shrink-0">
                            <LogOut className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-[14.5px] text-[#111827]">Logout</div>
                            <div className="text-[12px] text-[#6b7280] mt-0.5">logout your id</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#9ca3af]" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FIXED BOTTOM NAVIGATION BAR */}
            <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-[64px] bg-white border-t border-[#e5e7eb] grid grid-cols-4 items-center z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={() => setActiveBottomTab('home')}
                className="flex flex-col items-center justify-center h-full cursor-pointer transition-colors"
              >
                <Bike
                  className={`w-6 h-6 transition-colors ${
                    activeBottomTab === 'home' ? 'text-[#198737]' : 'text-[#6b7280]'
                  }`}
                />
                <span
                  className={`text-[11.5px] mt-1 font-semibold ${
                    activeBottomTab === 'home' ? 'text-[#198737] font-bold' : 'text-[#6b7280]'
                  }`}
                >
                  Home
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBottomTab('share')}
                className="flex flex-col items-center justify-center h-full cursor-pointer transition-colors"
              >
                <Share
                  className={`w-6 h-6 transition-colors ${
                    activeBottomTab === 'share' ? 'text-[#198737]' : 'text-[#6b7280]'
                  }`}
                />
                <span
                  className={`text-[11.5px] mt-1 font-semibold ${
                    activeBottomTab === 'share' ? 'text-[#198737] font-bold' : 'text-[#6b7280]'
                  }`}
                >
                  Share
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBottomTab('team')}
                className="flex flex-col items-center justify-center h-full cursor-pointer transition-colors"
              >
                <Users
                  className={`w-6 h-6 transition-colors ${
                    activeBottomTab === 'team' ? 'text-[#198737]' : 'text-[#6b7280]'
                  }`}
                />
                <span
                  className={`text-[11.5px] mt-1 font-semibold ${
                    activeBottomTab === 'team' ? 'text-[#198737] font-bold' : 'text-[#6b7280]'
                  }`}
                >
                  Team
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveBottomTab('my')}
                className="flex flex-col items-center justify-center h-full cursor-pointer transition-colors"
              >
                <UserCircle
                  className={`w-6 h-6 transition-colors ${
                    activeBottomTab === 'my' ? 'text-[#198737]' : 'text-[#6b7280]'
                  }`}
                />
                <span
                  className={`text-[11.5px] mt-1 font-semibold ${
                    activeBottomTab === 'my' ? 'text-[#198737] font-bold' : 'text-[#6b7280]'
                  }`}
                >
                  My
                </span>
              </button>
            </nav>
          </>
        )}

        {/* ==================== MODALS ==================== */}
        {/* 1. Welcome to Toing Modal */}
        <WelcomeModal
          isOpen={isWelcomeOpen && siteSettings.showWelcomeNotice}
          onClose={() => setIsWelcomeOpen(false)}
          channelUrl={siteSettings.channelUrl}
          minWithdrawal={siteSettings.minWithdrawal}
          minRecharge={siteSettings.minRecharge}
          inviteBonus={siteSettings.inviteBonus}
          teamCommission={siteSettings.teamCommissionL1}
          noticeTitle={siteSettings.welcomeNoticeTitle}
        />

        {/* 2. TOING PAY PAYMENT GATEWAY MODAL - DIRECT PAYMENT GATEWAY OPEN */}
        <PaymentGatewayModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          initialAmount={paymentInitialAmount}
          availableBalance={currentUser.availableBalance}
          userMobile={currentUser.mobile}
          onDepositSuccess={handleDepositSuccess}
          showToast={showToast}
          minRecharge={siteSettings.minRecharge || 100}
        />

        {/* 3. Insufficient Balance Modal */}
        {insufficientPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl p-5 max-w-[360px] w-full text-center space-y-3.5 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-[18px] text-[#111827]">अपर्याप्त बैलेंस (Insufficient Balance)</h3>
              <p className="text-[13px] text-[#4b5563] leading-relaxed">
                इस प्लान (<strong className="text-[#198737]">{insufficientPlan.badgeTitle}</strong>) की कीमत{' '}
                <strong className="text-[#198737]">{formatINR(insufficientPlan.price)}</strong> है। आपके वॉलेट में अभी केवल{' '}
                <strong className="text-[#111827]">{formatINR(currentUser.availableBalance)}</strong> है।
              </p>
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const needed = Math.max(siteSettings.minRecharge || 100, insufficientPlan.price);
                    setInsufficientPlan(null);
                    openRechargeGateway(needed);
                  }}
                  className="w-full h-[48px] rounded-full bg-gradient-to-b from-[#2eb843] to-[#127a24] text-white font-bold text-[15px] shadow-md flex items-center justify-center gap-2 cursor-pointer btn-primary-animated"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  Recharge Now ({formatINR(insufficientPlan.price)})
                </button>
                <button
                  type="button"
                  onClick={() => setInsufficientPlan(null)}
                  className="w-full py-2 text-[13px] font-semibold text-[#6b7280] hover:text-[#111827] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Withdraw Modal */}
        <WithdrawModal
          isOpen={isWithdrawOpen}
          onClose={() => setIsWithdrawOpen(false)}
          user={currentUser}
          onWithdraw={handleWithdraw}
          onOpenBankModal={() => {
            setIsWithdrawOpen(false);
            setIsBankOpen(true);
          }}
          minWithdrawal={siteSettings.minWithdrawal || 100}
        />

        {/* 5. Bank Account Bind Modal */}
        <BankAccountModal
          isOpen={isBankOpen}
          onClose={() => setIsBankOpen(false)}
          initialDetails={currentUser?.bankDetails || DEFAULT_DEMO_USER.bankDetails}
          onSave={handleSaveBankDetails}
        />

        {/* 6. Collections Modal */}
        <CollectionsModal
          isOpen={isCollectionsOpen}
          onClose={() => setIsCollectionsOpen(false)}
          user={currentUser}
          onClaimIncome={handleClaimDailyIncome}
        />

        {/* 7. Transactions History Modal */}
        <TransactionsModal
          isOpen={isTransactionsOpen}
          onClose={() => setIsTransactionsOpen(false)}
          user={currentUser}
        />

        {/* 8. Info Sheets */}
        <InfoSheetModal
          isOpen={!!infoSheetType}
          onClose={() => setInfoSheetType(null)}
          type={infoSheetType || 'channel'}
          channelUrl={siteSettings.channelUrl}
          customerCareUrl={siteSettings.customerCareUrl}
        />

        {/* 9. MASTER ADMIN PANEL MODAL (Accessible via #admin or VIP badge secret gesture) */}
        <AdminPanel
          isOpen={isAdminOpen}
          onClose={() => {
            setIsAdminOpen(false);
            if (window.location.hash === '#admin') {
              window.location.hash = '';
            }
          }}
          showToast={showToast}
        />
      </div>
    </div>
  );
}
