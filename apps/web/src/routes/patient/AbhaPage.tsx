import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { abhaApi } from '../../lib/api/abha.api';
import { useAuthStore } from '../../lib/auth/auth-store';
import { AbhaCard } from '../../features/patient/AbhaCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { Tabs } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import {
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const AbhaPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'create' | 'link'>('create');
  const [hasConsented, setHasConsented] = useState(false);
  const [step, setStep] = useState<'consent' | 'aadhaar' | 'otp' | 'address'>('consent');

  // Ephemeral inputs (cleared immediately after use, never logged or stored)
  const [rawAadhaar, setRawAadhaar] = useState('');
  const [txnId, setTxnId] = useState('');
  const [otp, setOtp] = useState('');
  const [mobile, setMobile] = useState('');
  const [existingAbhaId, setExistingAbhaId] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch verified profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['abha-profile'],
    queryFn: () => abhaApi.getMe(),
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  // Step 1: Grant Consent
  const handleGrantConsent = async () => {
    if (!isAuthenticated) {
      addToast({
        type: 'info',
        title: 'Authentication Required',
        message: 'Please sign in to connect or register your ABHA identity.'
      });
      navigate('/login', { state: { from: { pathname: '/abha' } } });
      return;
    }
    setIsSubmitting(true);
    try {
      await abhaApi.grantConsent();
      setHasConsented(true);
      setStep('aadhaar');
      addToast({
        type: 'success',
        title: 'Patient Consent Recorded',
        message: 'Your consent has been logged in the ABDM audit registry.'
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Consent Error',
        message: err.response?.data?.error?.message || 'Could not record consent'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Request Aadhaar OTP (Create Flow)
  const handleRequestCreateOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{12}$/.test(rawAadhaar)) {
      addToast({ type: 'error', title: 'Invalid Aadhaar', message: 'Aadhaar must be exactly 12 digits' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await abhaApi.requestCreateOtp(rawAadhaar);
      setTxnId(res.txnId);
      // Privacy invariant: zero Aadhaar retention in memory or forms
      setRawAadhaar('');
      setStep('otp');
      const sandboxHint = (res as any).testOtp
        ? ` Sandbox OTP: ${(res as any).testOtp}`
        : '';
      addToast({
        type: 'info',
        title: (res as any).testOtp ? 'Sandbox OTP ready' : 'Aadhaar OTP sent by UIDAI',
        message:
          (res.message || res.hint ||
            'OTP goes to the mobile already linked with your Aadhaar (not LifeLink SMS).') +
          sandboxHint
      });
    } catch (err: any) {
      setRawAadhaar('');
      addToast({
        type: 'error',
        title: 'OTP Dispatch Failed',
        message: err.response?.data?.error?.message || 'Could not dispatch OTP'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Verify OTP and get address suggestions
  const handleVerifyCreateOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobile)) {
      addToast({
        type: 'error',
        title: 'Mobile required',
        message: 'Enter the 10-digit mobile to link with your ABHA (Eka / ABDM requirement).'
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await abhaApi.verifyCreateOtp(txnId, otp, mobile);
      setOtp('');
      const sug = await abhaApi.getAddressSuggestions(txnId);
      setAddressSuggestions(sug.suggestions || []);
      setSelectedAddress(sug.suggestions?.[0] || '');
      setStep('address');
      addToast({
        type: 'success',
        title: 'Aadhaar verified',
        message: sug.message || 'Choose or type your ABHA address. Profile details save on confirm.'
      });
    } catch (err: any) {
      setOtp('');
      addToast({
        type: 'error',
        title: 'Verification Failed',
        message: err.response?.data?.error?.message || 'Invalid OTP'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 4: Confirm Address & Create
  const handleConfirmAddress = async () => {
    setIsSubmitting(true);
    try {
      await abhaApi.confirmCreateAddress(txnId, selectedAddress);
      addToast({
        type: 'success',
        title: 'ABHA Created & Linked',
        message: 'ABHA saved to your profile. Open Profile to see name, gender, and DOB from ABDM.'
      });
      queryClient.invalidateQueries({ queryKey: ['abha-profile'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      setMobile('');
      setStep('consent');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Creation Failed',
        message: err.response?.data?.error?.message || 'Could not register ABHA'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Link Existing ABHA Flow
  const handleLinkInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Ensure consent recorded first
      await abhaApi.grantConsent();
      const res = await abhaApi.initLink(existingAbhaId);
      setTxnId(res.txnId);
      setStep('otp');
      addToast({
        type: 'info',
        title: res.testOtp ? 'Sandbox OTP ready' : 'OTP sent to your phone',
        message:
          res.hint ||
          res.message ||
          'Check SMS on the mobile linked with your ABHA (not email).'
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Link Initialization Failed',
        message: err.response?.data?.error?.message || 'Could not locate ABHA'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await abhaApi.verifyLink(txnId, otp);
      setOtp('');
      addToast({
        type: 'success',
        title: 'ABHA Successfully Linked',
        message: 'Photo, QR and details are saved to your profile.'
      });
      queryClient.invalidateQueries({ queryKey: ['abha-profile'] });
      setStep('consent');
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Could not verify link';
      const sessionDead =
        err.response?.status === 401 ||
        /refreshToken|unauthorized|session/i.test(String(msg));
      addToast({
        type: 'error',
        title: sessionDead ? 'Session expired' : 'Link Verification Failed',
        message: sessionDead
          ? 'Please sign in with Google again, then retry the ABHA OTP.'
          : msg
      });
      if (!sessionDead) setOtp('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    await abhaApi.unlink();
    queryClient.invalidateQueries({ queryKey: ['abha-profile'] });
    addToast({
      type: 'warning',
      title: 'ABHA Unlinked',
      message: 'Stored ABHA linkage purged from database.'
    });
  };

  return (
    <div className="ll-app-screen max-w-2xl mx-auto space-y-6 text-left">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal mb-1">ABDM · India</p>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-ink tracking-tight">
              {t('abha.title')}
            </h1>
            <Chip variant="orange" dot>
              {t('abha.badge')}
            </Chip>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            Connect ABHA for zero-paperwork triage and bed holds. OTP is SMS-only on your ABHA mobile.
          </p>
        </div>
      </div>

      {/* If not authenticated, prompt sign in */}
      {!isAuthenticated ? (
        <Card variant="surface" className="p-8 border border-hairline/80 shadow-soft text-center space-y-5 animate-in fade-in">
          <div className="w-16 h-16 rounded-3xl bg-blue/10 text-blue mx-auto flex items-center justify-center">
            <CreditCard className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-bold font-display text-navy">
              Connect Your ABHA Health Identity
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Link your Ayushman Bharat Health Account (ABDM) for zero-paperwork hospital triage and seamless bed reservations. Real-time encryption ensures zero storage of raw Aadhaar numbers or OTPs.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Button
              variant="primary"
              size="lg"
              className="px-8 font-bold shadow-soft"
              onClick={() => navigate('/login', { state: { from: { pathname: '/abha' } } })}
            >
              Sign In to Connect ABHA
            </Button>
          </div>
        </Card>
      ) : profile ? (
        <div className="space-y-4">
          <AbhaCard profile={profile} onUnlink={handleUnlink} />
        </div>
      ) : (
        /* Enrollment & Linkage Workflow */
        <Card variant="surface" className="p-6 border border-hairline/80 shadow-soft space-y-6">
          <Tabs
            tabs={[
              { id: 'create', label: t('abha.createTab') },
              { id: 'link', label: t('abha.linkTab') }
            ]}
            activeTab={activeTab}
            onChange={(val) => {
              setActiveTab(val as any);
              setStep('consent');
            }}
          />

          {/* STEP 1: CONSENT */}
          {step === 'consent' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-card rounded-2xl border border-hairline/60 space-y-2">
                <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green" />
                  {t('abha.consentTitle')}
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  {t('abha.consentBody')}
                </p>
              </div>

              <div className="p-3 bg-blue-light/60 border border-blue/20 rounded-2xl text-xs text-blue flex items-start gap-2">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Ephemeral PII Invariant:</strong> Aadhaar numbers and OTPs are held in-memory solely during the live HTTP request. Zero-disk persistence.
                </span>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleGrantConsent}
                isLoading={isSubmitting}
              >
                {t('abha.grantConsent')}
              </Button>
            </div>
          )}

          {/* CREATE FLOW: STEP 2 (AADHAAR ENTRY) */}
          {activeTab === 'create' && step === 'aadhaar' && (
            <form onSubmit={handleRequestCreateOtp} className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-900">
                <span><strong>ABDM Sandbox:</strong> For testing without live Aadhaar SMS, use <code>999999999999</code></span>
                <button
                  type="button"
                  onClick={() => setRawAadhaar('999999999999')}
                  className="font-bold text-blue hover:underline text-xs shrink-0"
                >
                  Autofill Sandbox ID
                </button>
              </div>

              <Input
                label={t('abha.aadhaarLabel')}
                placeholder={t('abha.aadhaarPlaceholder')}
                type="text"
                maxLength={12}
                autoComplete="off"
                value={rawAadhaar}
                onChange={(e) => setRawAadhaar(e.target.value.replace(/\D/g, ''))}
                hint={t('abha.aadhaarNotice')}
                leftIcon={<CreditCard className="w-4 h-4" />}
                required
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="md" onClick={() => setStep('consent')}>
                  Back
                </Button>
                <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
                  {t('abha.sendOtp')}
                </Button>
              </div>
            </form>
          )}

          {/* CREATE & LINK: STEP 3 (OTP VERIFICATION) */}
          {step === 'otp' && (
            <form
              onSubmit={activeTab === 'create' ? handleVerifyCreateOtp : handleLinkVerify}
              className="space-y-5 animate-in fade-in"
            >
              <div className="rounded-[22px] bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white p-5 relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-teal/30 blur-2xl" />
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-2 text-teal-200">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">SMS verification</span>
                  </div>
                  <p className="text-sm font-semibold leading-snug">
                    {activeTab === 'create'
                      ? 'Enter the UIDAI OTP from your Aadhaar-linked phone, plus a mobile for ABHA.'
                      : 'Enter the 6-digit OTP from your ABHA-linked mobile SMS (not email).'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOtp('123456')}
                    className="inline-flex items-center h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold transition"
                  >
                    Use sandbox OTP 123456
                  </button>
                </div>
              </div>

              {activeTab === 'create' && (
                <Input
                  label="Mobile number (for ABHA)"
                  placeholder="10-digit mobile"
                  type="tel"
                  maxLength={10}
                  autoComplete="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  hint="Required by ABDM / Eka — used to link your ABHA account"
                  leftIcon={<Lock className="w-4 h-4 text-muted" />}
                  required
                />
              )}

              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
                  {t('abha.otpLabel')}
                </label>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="w-full h-14 rounded-2xl bg-white border border-hairline text-center text-2xl font-display font-extrabold tracking-[0.35em] text-ink focus:outline-none focus:border-ink shadow-soft"
                  aria-label="6-digit OTP"
                  required
                />
                <p className="mt-2 text-[11px] text-muted text-center">
                  {activeTab === 'link'
                    ? 'SMS on ABHA-registered phone · expires quickly'
                    : 'UIDAI SMS on Aadhaar-linked phone'}
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  className="flex-1"
                  onClick={() => setStep(activeTab === 'create' ? 'aadhaar' : 'consent')}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="flex-[1.4]"
                  isLoading={isSubmitting}
                  disabled={otp.length !== 6}
                >
                  {t('abha.verifyOtp')}
                </Button>
              </div>
            </form>
          )}

          {/* CREATE FLOW: STEP 4 (CHOOSE ABHA ADDRESS) */}
          {activeTab === 'create' && step === 'address' && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  {t('abha.chooseAddress')}
                </label>
                {addressSuggestions.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {addressSuggestions.map((addr) => (
                      <label
                        key={addr}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          selectedAddress === addr
                            ? 'border-ink bg-card shadow-soft font-bold'
                            : 'border-hairline bg-white hover:bg-card-soft'
                        }`}
                      >
                        <span className="text-sm text-ink">{addr}</span>
                        <input
                          type="radio"
                          name="addressChoice"
                          checked={selectedAddress === addr}
                          onChange={() => setSelectedAddress(addr)}
                          className="accent-ink w-4 h-4"
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted mb-2">
                    No demo suggestions — type the ABHA address you want (e.g. yourname@abdm).
                  </p>
                )}
                <Input
                  label="Your ABHA address"
                  placeholder="yourname@abdm"
                  value={selectedAddress}
                  onChange={(e) => setSelectedAddress(e.target.value.trim().toLowerCase())}
                  hint="Must include @ (example: rehan.suman@abdm)"
                  leftIcon={<CreditCard className="w-4 h-4 text-muted" />}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleConfirmAddress}
                  isLoading={isSubmitting}
                  disabled={!selectedAddress.includes('@')}
                >
                  {t('abha.confirmEnrollment')}
                </Button>
              </div>
            </div>
          )}

          {/* LINK FLOW: INITIAL IDENTIFIER ENTRY */}
          {activeTab === 'link' && step === 'consent' && (
            <form onSubmit={handleLinkInit} className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-900">
                Already have ABHA? Enter your 14-digit number (e.g. <strong>91-3256-0414-4759</strong>).
                OTP is sent by ABDM to your <strong>ABHA-linked phone</strong> — not email.
              </div>
              <Input
                label="ABHA Number or ABHA Address"
                placeholder="91-3256-0414-4759 or name@abdm"
                value={existingAbhaId}
                onChange={(e) => setExistingAbhaId(e.target.value)}
                leftIcon={<CreditCard className="w-4 h-4 text-muted" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
              >
                Send Link OTP
              </Button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
};

