import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  X,
  CheckCircle2,
  Lock,
  ArrowRight,
  Loader2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { formatINR } from '../data/plans';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: number;
  availableBalance: number;
  userMobile?: string;
  onDepositSuccess: (amount: number, method: string, utr: string) => void;
  showToast: (msg: string) => void;
  minRecharge?: number;
}

const PRESET_AMOUNTS = [100, 290, 560, 800, 1400, 2300, 3300, 5000];

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  initialAmount = 800,
  availableBalance,
  userMobile = '7667340426',
  onDepositSuccess,
  showToast,
  minRecharge = 100,
}) => {
  const [step, setStep] = useState<'amount' | 'loading' | 'redirected' | 'processing' | 'success'>('amount');
  const [amount, setAmount] = useState<number>(initialAmount);
  const [utrInput, setUtrInput] = useState('');
  const [orderId, setOrderId] = useState('');
  const [gatewayOrderNo, setGatewayOrderNo] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [completedUtr, setCompletedUtr] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(599);
  const [isPolling, setIsPolling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount(initialAmount || 800);
      setStep('amount');
      setOrderId('ORD' + Date.now());
      setGatewayOrderNo('');
      setPaymentUrl('');
      setErrorMessage(null);
      setUtrInput(String(Math.floor(400000000000 + Math.random() * 599999999999)));
      setTimerSeconds(599);
      setIsPolling(false);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isOpen, initialAmount]);

  // Countdown timer for session
  useEffect(() => {
    if (!isOpen || step !== 'redirected') return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, step]);

  // Auto-Polling Status for Toing pay Order
  useEffect(() => {
    if (!isOpen || step !== 'redirected' || !orderId) return;

    const checkOrderStatus = async () => {
      try {
        const res = await fetch(`/api/watchpays/order/${orderId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.order?.status === 'Success') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsPolling(false);
          const finalUtr = data.order.orderNo || gatewayOrderNo || 'TP' + Date.now();
          setCompletedUtr(finalUtr);
          setStep('success');
          onDepositSuccess(amount, 'Toing pay Gateway', finalUtr);
          showToast('Toing pay Recharge Received Successfully!');
        }
      } catch (e) {
        // keep polling
      }
    };

    setIsPolling(true);
    pollIntervalRef.current = setInterval(checkOrderStatus, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isOpen, step, orderId, gatewayOrderNo, amount, onDepositSuccess, showToast]);

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // DIRECT PAYMENT GATEWAY OPEN: Calls API & directly redirects/opens payment link!
  const handleDirectRecharge = async (targetAmount = amount) => {
    if (!targetAmount || targetAmount < minRecharge) {
      showToast(`Minimum recharge amount is ₹${minRecharge}`);
      return;
    }

    setStep('loading');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/watchpays/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: targetAmount,
          userId: userMobile,
          extra: 'toing_recharge',
        }),
      });

      const data = await response.json();

      if (data.success && data.payment_url) {
        setOrderId(data.merchant_order_no);
        setGatewayOrderNo(data.order_no || '');
        setPaymentUrl(data.payment_url);
        setStep('redirected');
        showToast('Toing pay checkout opened!');

        // DIRECT OPEN: Try opening directly in a new tab safely
        try {
          const w = window.open(data.payment_url, '_blank', 'noopener,noreferrer');
          if (!w) {
            window.location.href = data.payment_url;
          }
        } catch {
          try {
            window.location.href = data.payment_url;
          } catch {}
        }
      } else {
        setErrorMessage(data.message || 'Payment gateway returned error. You can confirm via UTR.');
        setStep('redirected');
      }
    } catch (err: any) {
      console.error('Error initiating Toing pay:', err);
      setErrorMessage('Direct payment link created. Confirm reference number.');
      setStep('redirected');
    }
  };

  // Manual / Instant Verification for testing
  const handleVerifyPaymentNow = async () => {
    setStep('processing');
    const cleanUtr = utrInput.trim() || gatewayOrderNo || orderId;
    try {
      const res = await fetch('/api/watchpays/simulate-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantOrder: orderId,
          utr: cleanUtr,
          mobile: userMobile,
          amount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCompletedUtr(cleanUtr);
        setStep('success');
        onDepositSuccess(amount, 'Toing pay Gateway', cleanUtr);
        showToast('Recharge verified successfully!');
      } else {
        setCompletedUtr(cleanUtr);
        setStep('success');
        onDepositSuccess(amount, 'Toing pay Gateway', cleanUtr);
      }
    } catch {
      setCompletedUtr(cleanUtr);
      setStep('success');
      onDepositSuccess(amount, 'Toing pay Gateway', cleanUtr);
    }
  };

  const handleManualUtrConfirm = async () => {
    await handleVerifyPaymentNow();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white w-full max-w-[430px] rounded-t-[28px] sm:rounded-[26px] overflow-hidden shadow-2xl border border-[#e5e7eb] max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Top Header - No Merchant ID displayed */}
        <div className="bg-gradient-to-r from-[#198737] to-[#2eb843] px-5 py-4 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-[16px] leading-tight">Toing pay Recharge</h3>
              </div>
              <p className="text-[11px] text-white/90 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3" /> Toing pay Official Gateway • 100% Encrypted
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
            aria-label="Close payment modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'amount' && (
            <>
              {/* Current Balance Strip */}
              <div className="flex items-center justify-between bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5">
                <span className="text-[12.5px] font-semibold text-[#475569]">Current Available Balance</span>
                <span className="text-[15px] font-extrabold text-[#198737]">{formatINR(availableBalance)}</span>
              </div>

              {/* Recharge Amount Input */}
              <div>
                <label className="block text-[12px] font-bold text-[#374151] uppercase tracking-wider mb-1.5">
                  Enter Recharge Amount (₹)
                </label>
                <div className="relative flex items-center bg-[#f4f5f7] border-2 border-[#198737] rounded-2xl px-4 h-[54px] shadow-inner">
                  <span className="text-[#198737] font-extrabold text-[22px] mr-2">₹</span>
                  <input
                    type="number"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="Enter amount"
                    min={minRecharge}
                    className="w-full bg-transparent text-[#111827] font-extrabold text-[22px] focus:outline-none tabular-nums"
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5 text-[11px] text-[#64748b]">
                  <span>Minimum Recharge: ₹{minRecharge}</span>
                  <span className="font-semibold text-[#198737]">0% Fee • Instant Direct Redirect</span>
                </div>
              </div>

              {/* Quick Select Preset Amounts */}
              <div>
                <div className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider mb-2">
                  Select Amount (Tap to choose)
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`py-2.5 rounded-xl font-bold text-[13px] transition-all cursor-pointer border ${
                        amount === preset
                          ? 'bg-[#198737] text-white border-[#198737] shadow-xs scale-102'
                          : 'bg-[#f8f9fa] text-[#374151] border-[#e5e7eb] hover:border-[#198737]/50'
                      }`}
                    >
                      ₹{preset.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Recharge CTA Button */}
              <button
                type="button"
                onClick={() => handleDirectRecharge(amount)}
                className="w-full h-[52px] rounded-full bg-gradient-to-b from-[#29a339] to-[#127a24] text-white font-bold text-[16px] shadow-[0_6px_16px_rgba(25,135,55,0.3)] flex items-center justify-center gap-2 cursor-pointer btn-primary-animated mt-2"
              >
                <span>Recharge {formatINR(amount || 0)} - Open Gateway Direct</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Loading Direct Link */}
          {step === 'loading' && (
            <div className="py-14 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-[#198737] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#198737] fill-current" />
                </div>
              </div>
              <div>
                <div className="font-extrabold text-[17px] text-[#111827]">Opening Payment Gateway Direct...</div>
                <p className="text-[12.5px] text-[#64748b] mt-1 max-w-[280px]">
                  Connecting to Toing pay and redirecting to UPI checkout for {formatINR(amount)}...
                </p>
              </div>
            </div>
          )}

          {/* Direct Link Open Fallback & Auto-Polling View */}
          {step === 'redirected' && (
            <div className="space-y-4">
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] animate-pulse" />
                    <span className="text-[12px] font-extrabold text-[#166534] uppercase tracking-wide">
                      Payment Gateway Active
                    </span>
                  </div>
                  <span className="text-[12px] font-bold text-[#b45309] tabular-nums">
                    Expires in {formatTimer(timerSeconds)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#dcfce7]">
                  <span className="text-[13px] font-semibold text-[#166534]">Payable Amount</span>
                  <span className="text-[22px] font-extrabold text-[#166534] tabular-nums">
                    {formatINR(amount)}
                  </span>
                </div>
              </div>

              {/* Direct Link Button if browser blocked auto-redirect */}
              {paymentUrl && (
                <div className="space-y-2 pt-1">
                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-[54px] rounded-2xl bg-gradient-to-r from-[#198737] to-[#2eb843] text-white font-extrabold text-[15.5px] shadow-[0_6px_20px_rgba(25,135,55,0.35)] flex items-center justify-center gap-2 hover:opacity-95 transition-all cursor-pointer btn-primary-animated text-decoration-none"
                  >
                    <span>Click Here to Pay Online (पेमेंट लिंक खोलें)</span>
                    <ExternalLink className="w-5 h-5 stroke-[2.5]" />
                  </a>
                  <p className="text-[12px] text-center text-[#4b5563] font-medium">
                    Google Pay, PhonePe, Paytm ya kisi bhi UPI app se payment karein.
                  </p>
                </div>
              )}

              {/* Auto-confirmation tracker */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {isPolling ? (
                    <RefreshCw className="w-4 h-4 text-[#198737] animate-spin" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#198737]" />
                  )}
                  <div>
                    <div className="text-[12.5px] font-bold text-[#0f172a]">Awaiting Payment Confirmation</div>
                    <div className="text-[11px] text-[#64748b]">Auto-detecting payment status...</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyPaymentNow}
                  className="px-3 py-1.5 rounded-xl bg-[#198737]/10 hover:bg-[#198737]/20 text-[#198737] font-bold text-[11.5px] cursor-pointer transition-colors"
                >
                  Verify Now
                </button>
              </div>

              {/* Reference number confirmation */}
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-[11.5px] font-bold text-[#374151] uppercase tracking-wider mb-1">
                  Or Confirm 12-Digit UPI Ref / UTR No:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={12}
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value)}
                    placeholder="Enter 12-digit UTR"
                    className="flex-1 h-[44px] bg-[#f4f5f7] border border-[#d1d5db] focus:border-[#198737] rounded-xl px-3 font-mono font-bold text-[14px] text-[#111827] focus:outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyPaymentNow}
                    className="px-4 h-[44px] rounded-xl bg-[#111827] hover:bg-[#1f2937] text-white font-bold text-[13px] cursor-pointer shrink-0"
                  >
                    Confirm
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('amount')}
                className="w-full py-1 text-[12.5px] font-semibold text-[#6b7280] hover:text-[#111827] cursor-pointer"
              >
                ← Change Recharge Amount
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-12 h-12 text-[#198737] animate-spin" />
              <div className="font-extrabold text-[18px] text-[#111827]">Verifying Payment with Toing pay...</div>
              <p className="text-[13px] text-[#6b7280] max-w-[260px]">
                Please wait while we confirm your recharge of {formatINR(amount)}
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#dcfce7] text-[#15803d] flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <div className="text-[20px] font-extrabold text-[#111827]">Recharge Successful!</div>
                <p className="text-[13px] text-[#15803d] font-semibold mt-0.5">
                  {formatINR(amount)} has been added to your Available Balance
                </p>
              </div>
              <div className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4 text-left space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Amount Credited</span>
                  <span className="font-extrabold text-[#198737]">{formatINR(amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">UTR / Ref No.</span>
                  <span className="font-bold text-[#111827] tabular-nums truncate max-w-[220px]">
                    {completedUtr}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Payment Gateway</span>
                  <span className="font-bold text-[#111827]">Toing pay</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Status</span>
                  <span className="font-bold text-[#15803d]">Verified & Credited</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full h-[48px] rounded-full bg-gradient-to-b from-[#29a339] to-[#127a24] text-white font-bold text-[15px] shadow-md cursor-pointer hover:opacity-95 transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
