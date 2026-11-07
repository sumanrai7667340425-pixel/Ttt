import React, { useState } from 'react';
import {
  X,
  Send,
  Building2,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Headphones,
  Sparkles,
  Wallet,
  MessageSquare,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { UserAccount, BankDetails, formatINR } from '../data/plans';

const DEFAULT_OFFICIAL_CHANNEL_URL = 'https://t.me/+gz_IQSaa0bViODFl';
const DEFAULT_CUSTOMER_CARE_URL = 'https://t.me/WATCHpay01x';

/* 1. Welcome to Toing Modal */
export const WelcomeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  channelUrl?: string;
  minWithdrawal?: number;
  minRecharge?: number;
  inviteBonus?: number;
  teamCommission?: number;
  noticeTitle?: string;
}> = ({
  isOpen,
  onClose,
  channelUrl = DEFAULT_OFFICIAL_CHANNEL_URL,
  minWithdrawal = 100,
  minRecharge = 100,
  inviteBonus = 100,
  teamCommission = 10,
  noticeTitle = 'Welcome to Toing',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] px-5">
      <div className="bg-white w-full max-w-[360px] rounded-[24px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Green Header */}
        <div className="bg-gradient-to-r from-[#28a438] to-[#1a872a] px-6 py-4 flex items-center justify-between relative">
          <div className="w-8" />
          <h3 className="text-white font-bold text-[19px] tracking-tight text-center">
            {noticeTitle}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/25 hover:bg-white/35 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close welcome modal"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Rows */}
        <div className="px-6 pt-3 pb-6">
          <div className="divide-y divide-[#f1f5f9] text-[15px]">
            <div className="py-3.5 flex items-center justify-between">
              <span className="text-[#4b5563] font-medium">Invite 1 User</span>
              <span className="text-[#198737] font-bold">₹{inviteBonus}</span>
            </div>
            <div className="py-3.5 flex items-center justify-between">
              <span className="text-[#4b5563] font-medium">Minimum Recharge</span>
              <span className="text-[#198737] font-bold">₹{minRecharge}</span>
            </div>
            <div className="py-3.5 flex items-center justify-between">
              <span className="text-[#4b5563] font-medium">Minimum Withdrawal</span>
              <span className="text-[#198737] font-bold">₹{minWithdrawal}</span>
            </div>
            <div className="py-3.5 flex items-center justify-between">
              <span className="text-[#4b5563] font-medium">Withdrawal Time</span>
              <span className="text-[#198737] font-bold">24x7 hours</span>
            </div>
            <div className="py-3.5 flex items-center justify-between">
              <span className="text-[#4b5563] font-medium">Team Commission</span>
              <span className="text-[#198737] font-bold">{teamCommission}%</span>
            </div>
          </div>

          {/* Animated Official Channel Link Button */}
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="mt-4 w-full h-[50px] rounded-full bg-gradient-to-b from-[#2eb843] to-[#167c26] text-white font-bold text-[16px] flex items-center justify-center gap-2.5 shadow-[0_6px_16px_rgba(25,135,55,0.3)] cursor-pointer btn-primary-animated group text-decoration-none"
          >
            <span className="w-6 h-6 rounded-full bg-white text-[#198737] flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <Send className="w-3.5 h-3.5 -ml-0.5 fill-current" />
            </span>
            Official Channel
          </a>
        </div>
      </div>
    </div>
  );
};

/* 2. Withdraw Modal */
export const WithdrawModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount;
  onWithdraw: (amount: number, withdrawPwd: string) => boolean | Promise<boolean>;
  onOpenBankModal: () => void;
  minWithdrawal?: number;
}> = ({ isOpen, onClose, user, onWithdraw, onOpenBankModal, minWithdrawal = 100 }) => {
  const [amount, setAmount] = useState('');
  const [pwd, setPwd] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    const success = await onWithdraw(num, pwd);
    if (success) {
      setAmount('');
      setPwd('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4">
      <div className="bg-white w-full max-w-[430px] rounded-t-[28px] sm:rounded-[24px] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-[#28a438] to-[#1a872a] px-5 py-4 text-white flex items-center justify-between">
          <h3 className="font-bold text-[17px]">Withdraw Funds (24x7)</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-[#15803d] uppercase">Withdrawable Balance</div>
              <div className="text-[24px] font-extrabold text-[#198737]">{formatINR(user.availableBalance)}</div>
            </div>
            <div className="text-right text-[11.5px] text-[#4b5563] font-medium">
              <div>Min Withdrawal: <strong className="text-[#198737]">₹{minWithdrawal}</strong></div>
              <div>Time: <strong className="text-[#198737]">24x7 Instant</strong></div>
            </div>
          </div>

          {/* Bank Status */}
          <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#eaf7ec] text-[#198737] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-[#111827]">
                  {user?.bankDetails?.holderName ? user.bankDetails.bankName : 'No Bank Added Yet'}
                </div>
                <div className="text-[11.5px] text-[#6b7280]">
                  {user?.bankDetails?.accountNumber ? `A/C: ${user.bankDetails.accountNumber}` : 'Please bind account first'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenBankModal}
              className="text-[#198737] font-bold text-[12.5px] bg-white border border-[#198737]/30 hover:bg-[#eaf7ec] px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
            >
              {user?.bankDetails?.accountNumber ? 'Change' : 'Bind Now'}
            </button>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-[12px] font-bold text-[#374151] uppercase mb-1">
              Withdrawal Amount (Min ₹{minWithdrawal})
            </label>
            <div className="relative flex items-center bg-[#f4f5f7] border border-[#d1d5db] focus-within:border-[#198737] rounded-2xl px-4 h-[50px]">
              <span className="text-[#198737] font-extrabold text-[20px] mr-2">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Minimum ₹${minWithdrawal}`}
                className="w-full bg-transparent font-extrabold text-[18px] text-[#111827] focus:outline-none"
              />
            </div>
          </div>

          {/* Withdrawal password input */}
          <div>
            <label className="block text-[12px] font-bold text-[#374151] uppercase mb-1">
              Withdrawal Password
            </label>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Enter your 6-digit withdrawal password"
              className="w-full h-[50px] bg-[#f4f5f7] border border-[#d1d5db] focus:border-[#198737] rounded-2xl px-4 font-medium text-[15px] text-[#111827] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full h-[50px] rounded-full bg-gradient-to-b from-[#2eb843] to-[#167c26] text-white font-bold text-[16px] shadow-[0_6px_16px_rgba(25,135,55,0.3)] cursor-pointer btn-primary-animated mt-2"
          >
            Confirm Withdrawal Request
          </button>
        </form>
      </div>
    </div>
  );
};

/* 3. Bank Account Bind Modal */
export const BankAccountModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialDetails?: BankDetails | null;
  onSave: (details: BankDetails) => void;
}> = ({ isOpen, onClose, initialDetails, onSave }) => {
  const [holderName, setHolderName] = useState(initialDetails?.holderName || '');
  const [bankName, setBankName] = useState(initialDetails?.bankName || 'State Bank of India');
  const [accountNumber, setAccountNumber] = useState(initialDetails?.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(initialDetails?.ifscCode || '');
  const [upiId, setUpiId] = useState(initialDetails?.upiId || '');

  React.useEffect(() => {
    if (initialDetails) {
      setHolderName(initialDetails.holderName || '');
      setBankName(initialDetails.bankName || 'State Bank of India');
      setAccountNumber(initialDetails.accountNumber || '');
      setIfscCode(initialDetails.ifscCode || '');
      setUpiId(initialDetails.upiId || '');
    }
  }, [initialDetails]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      holderName,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4">
      <div className="bg-white w-full max-w-[430px] rounded-t-[28px] sm:rounded-[24px] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-[#28a438] to-[#1a872a] px-5 py-4 text-white flex items-center justify-between">
          <h3 className="font-bold text-[17px]">Bind Bank & Payout Details</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-[11.5px] font-bold text-[#374151] uppercase mb-1">
              Account Holder Full Name
            </label>
            <input
              type="text"
              required
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="Name as per Bank Passbook"
              className="w-full h-[46px] bg-[#f4f5f7] border border-[#d1d5db] focus:border-[#198737] rounded-xl px-3.5 font-medium text-[14px] text-[#111827] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-bold text-[#374151] uppercase mb-1">
              Bank Name
            </label>
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. State Bank of India, HDFC"
              className="w-full h-[46px] bg-[#f4f5f7] border border-[#d1d5db] focus:border-[#198737] rounded-xl px-3.5 font-medium text-[14px] text-[#111827] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-bold text-[#374151] uppercase mb-1">
              Bank Account Number
            </label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter bank account number"
              className="w-full h-[46px] bg-[#f4f5f7] border border-[#d1d5db] focus:border-[#198737] rounded-xl px-3.5 font-medium text-[14px] text-[#111827] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-bold text-[#374151] uppercase mb-1">
              Bank IFSC Code
            </label>
            <input
              type="text"
              required
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              placeholder="e.g. SBIN0001234"
              className="w-full h-[46px] bg-[#f4f5f7] border border-[#d1d5db] focus:border-[#198737] rounded-xl px-3.5 font-mono font-bold text-[14px] text-[#111827] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11.5px] font-bold text-[#374151] uppercase mb-1">
              UPI ID (Optional for Direct UPI Transfer)
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. yourname@oksbi"
              className="w-full h-[46px] bg-[#f4f5f7] border border-[#d1d5db] focus:border-[#198737] rounded-xl px-3.5 font-medium text-[14px] text-[#111827] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full h-[48px] rounded-full bg-gradient-to-b from-[#2eb843] to-[#167c26] text-white font-bold text-[15px] shadow-[0_6px_16px_rgba(25,135,55,0.3)] cursor-pointer btn-primary-animated mt-2"
          >
            Save Bank Details
          </button>
        </form>
      </div>
    </div>
  );
};

/* 4. Collections Modal */
export const CollectionsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount;
  onClaimIncome: (planId: string) => void;
}> = ({ isOpen, onClose, user, onClaimIncome }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4">
      <div className="bg-white w-full max-w-[430px] rounded-t-[28px] sm:rounded-[24px] overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#28a438] to-[#1a872a] px-5 py-4 text-white flex items-center justify-between shrink-0">
          <h3 className="font-bold text-[17px]">My Subscribed Plans ({user.collections.length})</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {user.collections.length === 0 ? (
            <div className="py-12 text-center text-[#9ca3af]">
              <Sparkles className="w-12 h-12 mx-auto mb-2 text-[#d1d5db]" />
              <p className="font-semibold text-[15px]">No active plans found</p>
              <p className="text-[12px] mt-1 text-[#6b7280]">Recharge and activate a daily plan to start earning.</p>
            </div>
          ) : (
            user.collections.map((item) => (
              <div key={item.id} className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[14px] text-[#111827]">{item.title}</span>
                  <span className="bg-[#dcfce7] text-[#15803d] text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {item.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#e5e7eb] text-center">
                  <div>
                    <div className="text-[15px] font-extrabold text-[#198737]">{formatINR(item.dailyIncome)}</div>
                    <div className="text-[11px] text-[#6b7280]">Daily Return</div>
                  </div>
                  <div>
                    <div className="text-[15px] font-extrabold text-[#111827]">{item.days} Days</div>
                    <div className="text-[11px] text-[#6b7280]">Cycle</div>
                  </div>
                  <div>
                    <div className="text-[15px] font-extrabold text-[#198737]">{formatINR(item.totalIncome)}</div>
                    <div className="text-[11px] text-[#6b7280]">Total Return</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onClaimIncome(item.id)}
                  className="mt-3 w-full h-[40px] rounded-xl bg-[#198737] hover:bg-[#15803d] text-white font-bold text-[13px] shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> Claim Today's Daily Income ({formatINR(item.dailyIncome)})
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* 5. Transaction History Modal */
export const TransactionsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount;
}> = ({ isOpen, onClose, user }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4">
      <div className="bg-white w-full max-w-[430px] rounded-t-[28px] sm:rounded-[24px] overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#28a438] to-[#1a872a] px-5 py-4 text-white flex items-center justify-between shrink-0">
          <h3 className="font-bold text-[17px]">Transaction History</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-[#f1f5f9]">
          {user.transactions.length === 0 ? (
            <div className="py-12 text-center text-[#9ca3af]">No transactions yet</div>
          ) : (
            user.transactions.map((tx) => (
              <div key={tx.id} className="pt-2.5 first:pt-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.type === 'Recharge' || tx.type === 'Signup Bonus' || tx.type === 'Daily Income'
                        ? 'bg-[#eaf7ec] text-[#198737]'
                        : 'bg-[#fef2f2] text-[#dc2626]'
                    }`}
                  >
                    {tx.type === 'Recharge' || tx.type === 'Signup Bonus' || tx.type === 'Daily Income' ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-[13.5px] text-[#111827]">{tx.type}</div>
                    <div className="text-[11px] text-[#6b7280]">
                      {tx.timestamp} • {tx.method}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-extrabold text-[14.5px] ${
                      tx.type === 'Withdrawal' || tx.type === 'Plan Purchase'
                        ? 'text-[#dc2626]'
                        : 'text-[#198737]'
                    }`}
                  >
                    {tx.type === 'Withdrawal' || tx.type === 'Plan Purchase' ? '-' : '+'}
                    {formatINR(tx.amount)}
                  </div>
                  <div className="text-[10.5px] font-semibold text-[#15803d]">{tx.status}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* 6. Info Sheet / Telegram Link Confirmation */
export const InfoSheetModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  type: 'online' | 'channel' | 'customercare';
  channelUrl?: string;
  customerCareUrl?: string;
}> = ({
  isOpen,
  onClose,
  type,
  channelUrl = DEFAULT_OFFICIAL_CHANNEL_URL,
  customerCareUrl = DEFAULT_CUSTOMER_CARE_URL,
}) => {
  if (!isOpen) return null;

  const isChannel = type === 'channel';
  const targetUrl = isChannel ? channelUrl : customerCareUrl;
  const title = isChannel ? 'Official Telegram Channel' : '24x7 Customer Care Support';
  const desc = isChannel
    ? 'Join our official Toing telegram channel for daily payment proofs, withdrawal updates & bonus codes.'
    : 'Connect directly with our 24x7 official Telegram support agent for instant deposit help, withdrawal queries & account support.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-[360px] rounded-3xl p-5 space-y-4 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#eaf7ec] text-[#198737] flex items-center justify-center mx-auto shadow-sm">
          {isChannel ? <Send className="w-7 h-7" /> : <Headphones className="w-7 h-7" />}
        </div>
        <div>
          <h3 className="font-extrabold text-[18px] text-[#111827]">{title}</h3>
          <p className="text-[12.5px] text-[#6b7280] mt-1.5 leading-relaxed">{desc}</p>
        </div>
        <div className="space-y-2 pt-2">
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full h-[48px] rounded-full bg-gradient-to-b from-[#2eb843] to-[#127a24] text-white font-bold text-[15px] shadow-md flex items-center justify-center gap-2 cursor-pointer btn-primary-animated text-decoration-none"
          >
            <span>Open Telegram {isChannel ? 'Channel' : 'Support'}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-[13px] font-semibold text-[#6b7280] hover:text-[#111827] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
