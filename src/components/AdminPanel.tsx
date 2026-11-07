import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Settings,
  Layers,
  LogOut,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Save,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { PlanItem, formatINR } from '../data/plans';
import { SiteSettings } from '../data/siteConfig';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('toing_admin_session_active') === 'true';
    } catch {
      return false;
    }
  });

  const [adminUsernameInput, setAdminUsernameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'deposits' | 'withdrawals' | 'plans' | 'settings'>('dashboard');

  // Stats from Server SQLite DB
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBalance: 0,
    totalRecharge: 0,
    pendingWithdrawalsSum: 0,
    pendingWithdrawalsCount: 0,
  });

  // Users from Server SQLite DB
  const [usersList, setUsersList] = useState<any[]>([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Balance adjustment modal
  const [balanceModalUser, setBalanceModalUser] = useState<any | null>(null);
  const [balanceAmountInput, setBalanceAmountInput] = useState<number>(500);
  const [balanceActionType, setBalanceActionType] = useState<'add' | 'deduct'>('add');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Deposits & Withdrawals from Server SQLite DB
  const [depositsList, setDepositsList] = useState<any[]>([]);
  const [withdrawalsList, setWithdrawalsList] = useState<any[]>([]);

  // Plans from Server SQLite DB
  const [plansList, setPlansList] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isCreatingNewPlan, setIsCreatingNewPlan] = useState(false);
  const [planFormCategory, setPlanFormCategory] = useState<'daily' | 'vip'>('daily');
  const [planFormTitle, setPlanFormTitle] = useState('');
  const [planFormPrice, setPlanFormPrice] = useState(800);
  const [planFormDaily, setPlanFormDaily] = useState(200);
  const [planFormDays, setPlanFormDays] = useState(10);
  const [planFormTotal, setPlanFormTotal] = useState(2000);

  // Settings from Server SQLite DB
  const [settingsForm, setSettingsForm] = useState<SiteSettings>({
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
    welcomeNoticeBody: 'Welcome to Toing by Swiggy! Food delivery ka naya way.',
    showWelcomeNotice: true,
    gatewayName: 'Toing pay',
  });

  // Fetch all admin data from server
  const fetchAllData = async () => {
    if (!isAdminLoggedIn) return;
    try {
      // 1. Stats
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) setStats(statsData.stats);
      }

      // 2. Users
      fetchUsers();

      // 3. Deposits
      const depRes = await fetch('/api/admin/deposits');
      if (depRes.ok) {
        const depData = await depRes.json();
        if (depData.success) setDepositsList(depData.deposits || []);
      }

      // 4. Withdrawals
      const wdRes = await fetch('/api/admin/withdrawals');
      if (wdRes.ok) {
        const wdData = await wdRes.json();
        if (wdData.success) setWithdrawalsList(wdData.withdrawals || []);
      }

      // 5. Plans
      const planRes = await fetch('/api/admin/plans');
      if (planRes.ok) {
        const planData = await planRes.json();
        if (planData.success) setPlansList(planData.plans || []);
      }

      // 6. Settings
      const setRes = await fetch('/api/admin/settings');
      if (setRes.ok) {
        const setData = await setRes.json();
        if (setData.success && setData.settings) {
          setSettingsForm((prev) => ({
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
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  const fetchUsers = async (query = userSearchQuery) => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUsersList(data.users || []);
          setTotalUsersCount(data.totalCount || 0);
        }
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdminLoggedIn) {
      fetchAllData();
    }
  }, [isOpen, isAdminLoggedIn]);

  if (!isOpen) return null;

  // Handle Admin Login
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (adminUsernameInput.trim() === 'admin' || adminUsernameInput.trim() === 'toingadmin') &&
      (adminPasswordInput === 'admin123' || adminPasswordInput === '889900' || adminPasswordInput === 'password123')
    ) {
      setIsAdminLoggedIn(true);
      try {
        sessionStorage.setItem('toing_admin_session_active', 'true');
      } catch {}
      showToast('Admin Logged In Successfully');
    } else {
      showToast('Invalid Admin Credentials (Default: admin / admin123)');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    try {
      sessionStorage.removeItem('toing_admin_session_active');
    } catch {}
    showToast('Admin Logged Out');
  };

  // User Balance Change via Server API
  const handleApplyBalanceChange = async () => {
    if (!balanceModalUser) return;
    const amount = Number(balanceAmountInput);
    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount');
      return;
    }

    try {
      const res = await fetch('/api/admin/user/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: balanceModalUser.mobile,
          amount,
          type: balanceActionType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Balance of ${balanceModalUser.mobile} updated!`);
        setBalanceModalUser(null);
        fetchUsers();
        // Update stats
        const statsRes = await fetch('/api/admin/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.success) setStats(statsData.stats);
        }
      } else {
        showToast(data.message || 'Failed to update balance');
      }
    } catch (err: any) {
      showToast(err?.message || 'Server error');
    }
  };

  const handleDeleteUser = async (mobile: string) => {
    if (confirm(`Are you sure you want to permanently delete user ${mobile}?`)) {
      try {
        const res = await fetch('/api/admin/user/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`User ${mobile} deleted`);
          fetchUsers();
        }
      } catch (err) {
        showToast('Error deleting user');
      }
    }
  };

  // Approve Deposit via Server API
  const handleApproveDeposit = async (orderId: string) => {
    try {
      const res = await fetch('/api/admin/deposit/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Deposit approved & balance credited!');
        fetchAllData();
      } else {
        showToast(data.message || 'Error approving deposit');
      }
    } catch {
      showToast('Server error');
    }
  };

  // Approve Withdrawal via Server API
  const handleApproveWithdrawal = async (id: string) => {
    try {
      const res = await fetch('/api/admin/withdrawal/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Withdrawal marked as Approved!');
        fetchAllData();
      }
    } catch {
      showToast('Server error');
    }
  };

  // Reject Withdrawal via Server API
  const handleRejectWithdrawal = async (id: string) => {
    try {
      const res = await fetch('/api/admin/withdrawal/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Withdrawal rejected and refunded to user balance!');
        fetchAllData();
      }
    } catch {
      showToast('Server error');
    }
  };

  // Save Plan via Server API
  const handleSavePlan = async () => {
    if (!planFormTitle) {
      showToast('Please enter a title');
      return;
    }

    try {
      const res = await fetch('/api/admin/plans/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPlan ? editingPlan.id : undefined,
          category: planFormCategory,
          badgeTitle: planFormTitle,
          price: planFormPrice,
          dailyIncome: planFormDaily,
          days: planFormDays,
          totalIncome: planFormTotal,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Investment plan saved to server!');
        setEditingPlan(null);
        setIsCreatingNewPlan(false);
        fetchAllData();
      }
    } catch {
      showToast('Error saving plan');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm('Delete this plan from website?')) {
      try {
        const res = await fetch('/api/admin/plans/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Plan deleted');
          fetchAllData();
        }
      } catch {
        showToast('Error deleting plan');
      }
    }
  };

  // Save Settings via Server API
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Site settings updated in SQLite database!');
      }
    } catch {
      showToast('Error saving settings');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#f8fafc] w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-300 flex flex-col max-h-[96vh] overflow-hidden">
        {/* Top Header */}
        <div className="bg-[#111827] text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#198737] flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-[17px] tracking-wide">Toing Master Admin Panel</h2>
                <span className="bg-[#198737] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Centralized Server DB
                </span>
              </div>
              <p className="text-[12px] text-gray-400">High-Performance SQLite WAL Backend (100k+ Users Scalable)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdminLoggedIn && (
              <button
                type="button"
                onClick={handleAdminLogout}
                className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-[12px] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-[#198737] hover:bg-[#146c2c] text-white text-[12px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Back to App
            </button>
          </div>
        </div>

        {/* Admin Login Prompt */}
        {!isAdminLoggedIn ? (
          <div className="p-8 flex flex-col items-center justify-center text-center my-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#eaf7ec] text-[#198737] flex items-center justify-center mb-4 shadow-sm">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-[20px] font-extrabold text-[#111827]">Admin Verification Required</h3>
            <p className="text-[13px] text-gray-500 max-w-sm mt-1 mb-6">
              Enter your master admin credentials to view live user registrations & manage portal.
            </p>
            <form onSubmit={handleAdminLogin} className="w-full max-w-sm space-y-3.5">
              <div className="text-left">
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Admin Username</label>
                <input
                  type="text"
                  value={adminUsernameInput}
                  onChange={(e) => setAdminUsernameInput(e.target.value)}
                  placeholder="admin"
                  className="w-full h-[46px] rounded-xl border border-gray-300 px-3.5 font-medium text-[14px] bg-white focus:outline-none focus:border-[#198737]"
                />
              </div>
              <div className="text-left">
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Password or Master PIN</label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[46px] rounded-xl border border-gray-300 px-3.5 font-medium text-[14px] bg-white focus:outline-none focus:border-[#198737]"
                />
              </div>
              <button
                type="submit"
                className="w-full h-[48px] rounded-xl bg-[#198737] hover:bg-[#15732e] text-white font-bold text-[15px] shadow-md transition-all cursor-pointer mt-2"
              >
                Sign In to Admin Panel
              </button>
              <p className="text-[11.5px] text-gray-400 text-center">Default: admin / admin123 (or PIN: 889900)</p>
            </form>
          </div>
        ) : (
          /* Logged In Admin View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Navigation Tabs */}
            <div className="bg-white border-b border-gray-200 px-5 flex items-center justify-between gap-2 overflow-x-auto shrink-0 py-2">
              <div className="flex items-center gap-2">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
                  { id: 'users', label: `Users (${stats.totalUsers || totalUsersCount})`, icon: Users },
                  { id: 'deposits', label: `Recharges (${depositsList.length})`, icon: ArrowDownLeft },
                  { id: 'withdrawals', label: `Withdrawals (${withdrawalsList.length})`, icon: ArrowUpRight },
                  { id: 'plans', label: 'Investment Plans', icon: Layers },
                  { id: 'settings', label: 'Site Settings', icon: Settings },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3.5 py-2 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-[#198737] text-white shadow-xs'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={fetchAllData}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                title="Refresh Live Data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-5 flex-1 overflow-y-auto space-y-5">
              {/* 1. DASHBOARD OVERVIEW */}
              {activeTab === 'dashboard' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                      <div className="text-[12px] font-bold text-gray-500 uppercase">Live Registered Users</div>
                      <div className="text-[26px] font-extrabold text-[#111827] mt-1">{stats.totalUsers}</div>
                      <div className="text-[11px] text-[#198737] font-semibold mt-1">Central Server SQLite DB</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                      <div className="text-[12px] font-bold text-gray-500 uppercase">Total User Balances</div>
                      <div className="text-[26px] font-extrabold text-[#198737] mt-1">
                        {formatINR(stats.totalBalance)}
                      </div>
                      <div className="text-[11px] text-gray-500 font-semibold mt-1">Wallet Balances</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                      <div className="text-[12px] font-bold text-gray-500 uppercase">Total Recharges</div>
                      <div className="text-[26px] font-extrabold text-[#198737] mt-1">
                        {formatINR(stats.totalRecharge)}
                      </div>
                      <div className="text-[11px] text-gray-500 font-semibold mt-1">Toing pay Deposits</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                      <div className="text-[12px] font-bold text-gray-500 uppercase">Pending Withdrawals</div>
                      <div className="text-[26px] font-extrabold text-[#d97706] mt-1">
                        {formatINR(stats.pendingWithdrawalsSum)}
                      </div>
                      <div className="text-[11px] text-[#d97706] font-semibold mt-1">
                        {stats.pendingWithdrawalsCount} requests awaiting approval
                      </div>
                    </div>
                  </div>

                  {/* Architecture & Reliability Badge */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs">
                    <h3 className="font-extrabold text-[15px] text-[#111827]">Server Database Architecture</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px] mt-3">
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="font-bold text-gray-700">Storage Engine</div>
                        <div className="text-[#198737] font-extrabold mt-0.5">SQLite WAL Engine (100k+ users)</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="font-bold text-gray-700">Data Persistence</div>
                        <div className="text-[#111827] font-extrabold mt-0.5">Persistent on Server Disk (/data)</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="font-bold text-gray-700">Payment Gateway</div>
                        <div className="text-[#198737] font-extrabold mt-0.5">Toing pay (Direct Link Open)</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. USERS MANAGEMENT TAB (LIVE FROM SERVER SQLITE) */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => {
                          setUserSearchQuery(e.target.value);
                          fetchUsers(e.target.value);
                        }}
                        placeholder="Search 100k+ users by mobile, UID or invite..."
                        className="w-full h-[40px] pl-10 pr-3 rounded-xl border border-gray-300 text-[13px] bg-white focus:outline-none focus:border-[#198737]"
                      />
                    </div>
                    <div className="text-[12.5px] font-bold text-gray-500">
                      Total: {totalUsersCount} registered users
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                    {isLoadingUsers ? (
                      <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#198737]" /> Loading users from database...
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px]">
                            <tr>
                              <th className="p-3.5">Mobile / UID</th>
                              <th className="p-3.5">Password</th>
                              <th className="p-3.5">Available Balance</th>
                              <th className="p-3.5">Total Recharge</th>
                              <th className="p-3.5">Invite Code</th>
                              <th className="p-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {usersList.map((u) => {
                              const isPwdVisible = showPasswords[u.mobile] || false;
                              return (
                                <tr key={u.mobile} className="hover:bg-gray-50/80 transition-colors">
                                  <td className="p-3.5">
                                    <div className="font-extrabold text-[#111827]">{u.mobile}</div>
                                    <div className="text-[11px] text-gray-500 font-medium">UID: {u.uid}</div>
                                  </td>
                                  <td className="p-3.5">
                                    <div className="flex items-center gap-1.5 font-mono text-[12px]">
                                      <span>{isPwdVisible ? u.password : '••••••'}</span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setShowPasswords((prev) => ({
                                            ...prev,
                                            [u.mobile]: !prev[u.mobile],
                                          }))
                                        }
                                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                      >
                                        {isPwdVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                    <div className="text-[10.5px] text-gray-400">Withdraw: {u.withdrawal_password}</div>
                                  </td>
                                  <td className="p-3.5 font-extrabold text-[#198737]">
                                    {formatINR(u.available_balance || 0)}
                                  </td>
                                  <td className="p-3.5 font-bold text-gray-700">
                                    {formatINR(u.total_recharge || 0)}
                                  </td>
                                  <td className="p-3.5 font-mono font-bold text-gray-700">{u.invite_code}</td>
                                  <td className="p-3.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBalanceModalUser(u);
                                          setBalanceActionType('add');
                                          setBalanceAmountInput(500);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-[#eaf7ec] text-[#198737] hover:bg-[#d5f2d9] font-bold text-[11px] cursor-pointer"
                                      >
                                        + Balance
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBalanceModalUser(u);
                                          setBalanceActionType('deduct');
                                          setBalanceAmountInput(500);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-[11px] cursor-pointer"
                                      >
                                        - Deduct
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteUser(u.mobile)}
                                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                                        title="Delete User"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. RECHARGES / DEPOSITS TAB */}
              {activeTab === 'deposits' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-[15px] text-[#111827]">Toing pay Gateway Orders</h3>
                      <p className="text-[12px] text-gray-500">Live recharge transactions from database</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                    {depositsList.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-[13.5px]">No recharge orders yet</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px]">
                            <tr>
                              <th className="p-3.5">Order ID</th>
                              <th className="p-3.5">User Mobile</th>
                              <th className="p-3.5">Amount</th>
                              <th className="p-3.5">Date</th>
                              <th className="p-3.5">Status</th>
                              <th className="p-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {depositsList.map((dep) => (
                              <tr key={dep.id} className="hover:bg-gray-50/80">
                                <td className="p-3.5 font-mono font-bold text-[#111827]">
                                  {dep.merchant_order_no}
                                </td>
                                <td className="p-3.5 font-bold text-gray-800">{dep.user_mobile}</td>
                                <td className="p-3.5 font-extrabold text-[#198737]">{formatINR(dep.amount)}</td>
                                <td className="p-3.5 text-gray-500 text-[12px]">{dep.created_at}</td>
                                <td className="p-3.5">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                                      dep.status === 'Success'
                                        ? 'bg-[#dcfce7] text-[#15803d]'
                                        : dep.status === 'failed'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {dep.status}
                                  </span>
                                </td>
                                <td className="p-3.5 text-right">
                                  {dep.status !== 'Success' && (
                                    <button
                                      type="button"
                                      onClick={() => handleApproveDeposit(dep.merchant_order_no)}
                                      className="px-2.5 py-1 rounded-lg bg-[#198737] text-white font-bold text-[11px] hover:bg-[#146c2c] cursor-pointer"
                                    >
                                      Approve & Credit
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. WITHDRAWALS TAB */}
              {activeTab === 'withdrawals' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-[15px] text-[#111827]">User Withdrawal Requests</h3>
                      <p className="text-[12px] text-gray-500">Live payouts requests from database</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                    {withdrawalsList.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-[13.5px]">No withdrawal requests pending</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px]">
                            <tr>
                              <th className="p-3.5">User</th>
                              <th className="p-3.5">Amount</th>
                              <th className="p-3.5">Bank Account / UPI</th>
                              <th className="p-3.5">Date</th>
                              <th className="p-3.5">Status</th>
                              <th className="p-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {withdrawalsList.map((wd) => (
                              <tr key={wd.id} className="hover:bg-gray-50/80">
                                <td className="p-3.5">
                                  <div className="font-extrabold text-[#111827]">{wd.user_mobile}</div>
                                  <div className="text-[11px] text-gray-500">UID: {wd.user_uid}</div>
                                </td>
                                <td className="p-3.5 font-extrabold text-[#b45309]">{formatINR(wd.amount)}</td>
                                <td className="p-3.5">
                                  <div className="font-bold text-[#111827]">{wd.holder_name || 'Account Holder'}</div>
                                  <div className="text-[11px] text-gray-600">
                                    {wd.bank_name} • A/C: {wd.account_number} • IFSC: {wd.ifsc_code}
                                  </div>
                                  {wd.upi_id && <div className="text-[11px] text-[#198737] font-semibold">UPI: {wd.upi_id}</div>}
                                </td>
                                <td className="p-3.5 text-gray-500 text-[12px]">{wd.created_at}</td>
                                <td className="p-3.5">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                                      wd.status === 'Approved'
                                        ? 'bg-[#dcfce7] text-[#15803d]'
                                        : wd.status === 'Rejected'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {wd.status}
                                  </span>
                                </td>
                                <td className="p-3.5 text-right">
                                  {wd.status === 'Pending' && (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleApproveWithdrawal(wd.id)}
                                        className="px-2.5 py-1 rounded-lg bg-[#198737] text-white font-bold text-[11px] hover:bg-[#146c2c] cursor-pointer"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRejectWithdrawal(wd.id)}
                                        className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-bold text-[11px] cursor-pointer"
                                      >
                                        Reject & Refund
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. INVESTMENT PLANS TAB */}
              {activeTab === 'plans' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-[15px] text-[#111827]">Investment Plans</h3>
                      <p className="text-[12px] text-gray-500">Live plans stored in SQLite database</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlan(null);
                        setIsCreatingNewPlan(true);
                        setPlanFormCategory('daily');
                        setPlanFormTitle('DAILY INCOME DAILY WITHDRAWAL');
                        setPlanFormPrice(1000);
                        setPlanFormDaily(250);
                        setPlanFormDays(15);
                        setPlanFormTotal(3750);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#198737] hover:bg-[#146c2c] text-white font-bold text-[12.5px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" /> Add New Plan
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {plansList.map((plan) => (
                      <div key={plan.id} className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                        <div>
                          <div className="font-extrabold text-[13.5px] text-[#198737]">{plan.badge_title}</div>
                          <div className="text-[12.5px] text-gray-700 font-bold mt-1">
                            Price: {formatINR(plan.price)} • Daily: {formatINR(plan.daily_income)}
                          </div>
                          <div className="text-[11.5px] text-gray-500 font-medium">
                            Cycle: {plan.days} Days • Total: {formatINR(plan.total_income)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlan(plan);
                              setIsCreatingNewPlan(false);
                              setPlanFormCategory(plan.category);
                              setPlanFormTitle(plan.badge_title);
                              setPlanFormPrice(plan.price);
                              setPlanFormDaily(plan.daily_income);
                              setPlanFormDays(plan.days);
                              setPlanFormTotal(plan.total_income);
                            }}
                            className="p-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlan(plan.id)}
                            className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. SITE SETTINGS TAB */}
              {activeTab === 'settings' && (
                <form onSubmit={handleSaveSettings} className="space-y-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                  <h3 className="font-extrabold text-[16px] text-[#111827]">Server Master Configuration</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold text-gray-700 uppercase mb-1">
                        Minimum Withdrawal (₹)
                      </label>
                      <input
                        type="number"
                        value={settingsForm.minWithdrawal}
                        onChange={(e) => setSettingsForm({ ...settingsForm, minWithdrawal: Number(e.target.value) })}
                        className="w-full h-[44px] rounded-xl border border-gray-300 px-3.5 font-bold text-[14px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-gray-700 uppercase mb-1">
                        Minimum Recharge (₹)
                      </label>
                      <input
                        type="number"
                        value={settingsForm.minRecharge}
                        onChange={(e) => setSettingsForm({ ...settingsForm, minRecharge: Number(e.target.value) })}
                        className="w-full h-[44px] rounded-xl border border-gray-300 px-3.5 font-bold text-[14px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-gray-700 uppercase mb-1">
                        Invite 1 User Bonus (₹)
                      </label>
                      <input
                        type="number"
                        value={settingsForm.inviteBonus}
                        onChange={(e) => setSettingsForm({ ...settingsForm, inviteBonus: Number(e.target.value) })}
                        className="w-full h-[44px] rounded-xl border border-gray-300 px-3.5 font-bold text-[14px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-gray-700 uppercase mb-1">
                        Team Level 1 Commission (%)
                      </label>
                      <input
                        type="number"
                        value={settingsForm.teamCommissionL1}
                        onChange={(e) => setSettingsForm({ ...settingsForm, teamCommissionL1: Number(e.target.value) })}
                        className="w-full h-[44px] rounded-xl border border-gray-300 px-3.5 font-bold text-[14px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-[12px] font-bold text-gray-700 uppercase mb-1">
                        Telegram Official Channel Link
                      </label>
                      <input
                        type="url"
                        value={settingsForm.channelUrl}
                        onChange={(e) => setSettingsForm({ ...settingsForm, channelUrl: e.target.value })}
                        className="w-full h-[44px] rounded-xl border border-gray-300 px-3.5 font-medium text-[13px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-gray-700 uppercase mb-1">
                        Telegram Customer Care Link
                      </label>
                      <input
                        type="url"
                        value={settingsForm.customerCareUrl}
                        onChange={(e) => setSettingsForm({ ...settingsForm, customerCareUrl: e.target.value })}
                        className="w-full h-[44px] rounded-xl border border-gray-300 px-3.5 font-medium text-[13px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-gray-700 uppercase mb-1">
                        Popup Notice Announcement Title
                      </label>
                      <input
                        type="text"
                        value={settingsForm.welcomeNoticeTitle}
                        onChange={(e) => setSettingsForm({ ...settingsForm, welcomeNoticeTitle: e.target.value })}
                        className="w-full h-[44px] rounded-xl border border-gray-300 px-3.5 font-bold text-[14px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-gray-700 uppercase mb-1">
                        Popup Notice Body Text
                      </label>
                      <textarea
                        rows={3}
                        value={settingsForm.welcomeNoticeBody}
                        onChange={(e) => setSettingsForm({ ...settingsForm, welcomeNoticeBody: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 p-3 text-[13px]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-[48px] rounded-xl bg-[#198737] hover:bg-[#146c2c] text-white font-bold text-[15px] shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Save className="w-5 h-5" /> Save All Site Settings to Server
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BALANCE ADJUSTMENT MODAL */}
      {balanceModalUser && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-[16px] text-gray-900">
              {balanceActionType === 'add' ? 'Add Balance to' : 'Deduct Balance from'} {balanceModalUser.mobile}
            </h3>
            <p className="text-[12.5px] text-gray-500">
              Current Balance: <span className="font-extrabold text-[#198737]">{formatINR(balanceModalUser.available_balance || 0)}</span>
            </p>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Amount (₹)</label>
              <input
                type="number"
                value={balanceAmountInput}
                onChange={(e) => setBalanceAmountInput(Number(e.target.value))}
                min={1}
                className="w-full h-[46px] rounded-xl border border-gray-300 px-3.5 font-bold text-[16px]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApplyBalanceChange}
                className={`flex-1 h-[44px] rounded-xl font-bold text-white text-[14px] cursor-pointer ${
                  balanceActionType === 'add' ? 'bg-[#198737]' : 'bg-amber-600'
                }`}
              >
                Confirm {balanceActionType === 'add' ? 'Credit' : 'Debit'}
              </button>
              <button
                type="button"
                onClick={() => setBalanceModalUser(null)}
                className="px-4 h-[44px] rounded-xl bg-gray-100 text-gray-700 font-bold text-[13px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN FORM MODAL */}
      {(editingPlan || isCreatingNewPlan) && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full space-y-3.5 shadow-2xl">
            <h3 className="font-extrabold text-[16px] text-gray-900">
              {editingPlan ? 'Edit Investment Plan' : 'Add New Investment Plan'}
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Category</label>
              <select
                value={planFormCategory}
                onChange={(e) => setPlanFormCategory(e.target.value as any)}
                className="w-full h-[42px] rounded-xl border border-gray-300 px-3 text-[13px] font-bold"
              >
                <option value="daily">Daily Income Plan</option>
                <option value="vip">VIP-Plan</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Plan Title</label>
              <input
                type="text"
                value={planFormTitle}
                onChange={(e) => setPlanFormTitle(e.target.value)}
                placeholder="DAILY INCOME DAILY WITHDRAWAL"
                className="w-full h-[42px] rounded-xl border border-gray-300 px-3 text-[13px] font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={planFormPrice}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    setPlanFormPrice(p);
                    setPlanFormTotal(planFormDaily * planFormDays);
                  }}
                  className="w-full h-[42px] rounded-xl border border-gray-300 px-3 text-[14px] font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Daily Income (₹)</label>
                <input
                  type="number"
                  value={planFormDaily}
                  onChange={(e) => {
                    const d = Number(e.target.value);
                    setPlanFormDaily(d);
                    setPlanFormTotal(d * planFormDays);
                  }}
                  className="w-full h-[42px] rounded-xl border border-gray-300 px-3 text-[14px] font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Cycle Days</label>
                <input
                  type="number"
                  value={planFormDays}
                  onChange={(e) => {
                    const dy = Number(e.target.value);
                    setPlanFormDays(dy);
                    setPlanFormTotal(planFormDaily * dy);
                  }}
                  className="w-full h-[42px] rounded-xl border border-gray-300 px-3 text-[14px] font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Total Return (₹)</label>
                <input
                  type="number"
                  value={planFormTotal}
                  onChange={(e) => setPlanFormTotal(Number(e.target.value))}
                  className="w-full h-[42px] rounded-xl border border-gray-300 px-3 text-[14px] font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSavePlan}
                className="flex-1 h-[44px] rounded-xl bg-[#198737] text-white font-bold text-[13.5px] cursor-pointer"
              >
                Save Plan
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingPlan(null);
                  setIsCreatingNewPlan(false);
                }}
                className="px-4 h-[44px] rounded-xl bg-gray-100 text-gray-700 font-bold text-[13px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
