import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Mail,
  KeyRound,
  User,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { UserProfile } from "../../types";
import { chatStorage } from "../../services/storage";

export type AuthModalInitialView = "prompt" | "email" | "profile";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  initialView?: AuthModalInitialView;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialView = "prompt",
}) => {
  const [step, setStep] = useState<"prompt" | "email" | "otp" | "profile">("prompt");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message?: string;
  }>({ checking: false, available: null });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [requiresConfigNotice, setRequiresConfigNotice] = useState<string | null>(null);

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const checkUsernameTimeoutRef = useRef<any>(null);

  // Sync initial view when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(initialView);
      setErrorMessage(null);
      setInfoMessage(null);
      setRequiresConfigNotice(null);
    }
  }, [isOpen, initialView]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Google Identity Services integration inside the modal
  useEffect(() => {
    if (!isOpen || step !== "email") return;

    const clientId =
      chatStorage.getGoogleClientId() ||
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
      "";

    if (!clientId) return;

    const initGoogle = () => {
      if (typeof window === "undefined" || !(window as any).google?.accounts?.id) return;
      try {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = "";
          (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "filled_blue",
            size: "large",
            text: "continue_with",
            shape: "pill",
            logo_alignment: "left",
            width: 280,
          });
        }
      } catch (err) {
        console.warn("Google Sign-In modal render notice:", err);
      }
    };

    if ((window as any).google?.accounts?.id) {
      initGoogle();
    } else {
      const timer = setTimeout(initGoogle, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, step]);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: response.credential }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid || !data.user) {
        throw new Error(data.error || "Failed to authenticate with Google.");
      }
      chatStorage.saveUser(data.user);
      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Google authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced username availability checker
  const handleUsernameChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
    setUsername(sanitized);

    if (checkUsernameTimeoutRef.current) {
      clearTimeout(checkUsernameTimeoutRef.current);
    }

    if (sanitized.length < 3) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: "Username must be at least 3 characters",
      });
      return;
    }

    setUsernameStatus({ checking: true, available: null });
    checkUsernameTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/check-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: sanitized }),
        });
        const data = await res.json();
        setUsernameStatus({
          checking: false,
          available: data.available,
          message: data.available ? "Username available" : data.reason || "Username taken",
        });
      } catch {
        setUsernameStatus({
          checking: false,
          available: null,
          message: "Could not verify username",
        });
      }
    }, 400);
  };

  // Request OTP from server
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email or Gmail address.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    setRequiresConfigNotice(null);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();

      if (res.status === 503 && data.requiresConfiguration) {
        setRequiresConfigNotice(data.message);
        setErrorMessage(data.message);
        return;
      }

      if (!res.ok || !data.success) {
        if (data.cooldownSeconds) {
          setCooldown(data.cooldownSeconds);
        }
        throw new Error(data.message || data.error || "Failed to send verification code.");
      }

      setCooldown(data.cooldownSeconds || 60);
      setInfoMessage(data.message || `Verification code sent to ${cleanEmail}`);
      setStep("otp");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify submitted OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanOtp = otp.trim().replace(/\D/g, "");
    if (cleanOtp.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: cleanOtp }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        throw new Error(data.error || "Invalid verification code.");
      }

      if (data.requiresProfileSetup) {
        // Pre-fill default suggested display name & username
        const prefix = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 18);
        setDisplayName(prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : "MEYRA Member");
        handleUsernameChange(prefix || `user_${Date.now().toString().slice(-4)}`);
        setStep("profile");
      } else if (data.user) {
        // Existing user already had profile
        chatStorage.saveUser(data.user);
        onLoginSuccess(data.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to verify code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Complete profile and finish setup
  const handleCompleteProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username || username.length < 3) {
      setErrorMessage("Please choose a valid username (at least 3 characters).");
      return;
    }

    if (usernameStatus.available === false) {
      setErrorMessage(usernameStatus.message || "Please choose an available username.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: displayName.trim() || username,
          username: username.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.user) {
        throw new Error(data.error || "Failed to save profile.");
      }

      chatStorage.saveUser(data.user);
      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete profile.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="meyra-auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[#131317] border border-white/10 shadow-2xl overflow-hidden relative">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          {step !== "prompt" && step !== "email" ? (
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setStep(step === "profile" ? "otp" : "email");
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MEYRA AI</span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer ml-auto"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 0: Continuous Chat Login Prompt */}
        {step === "prompt" && (
          <div className="p-5 pt-2 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white tracking-tight">
                Continue with MEYRA AI
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-[260px] mx-auto">
                Create your MEYRA AI account to keep your account and conversation history connected.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStep("email");
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
              >
                Continue
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors cursor-pointer"
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Email / Gmail Input */}
        {step === "email" && (
          <div className="p-5 pt-2 space-y-4">
            <div className="space-y-1 text-center">
              <h3 className="text-base font-bold text-white tracking-tight">
                Create your MEYRA AI account
              </h3>
              <p className="text-xs text-slate-400">
                Enter your email to receive a secure 6-digit verification code.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-snug">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Email / Gmail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0A0A0E] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || cooldown > 0}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:text-slate-400 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Resend in {cooldown}s</span>
                ) : (
                  <span>Send OTP</span>
                )}
              </button>
            </form>

            {/* Official Google Sign-In Option */}
            <div className="pt-2 border-t border-white/5 text-center space-y-2.5">
              <span className="text-[11px] text-slate-500 font-medium">or continue with</span>
              <div ref={googleBtnRef} className="flex justify-center min-h-[40px]" />
            </div>

            {requiresConfigNotice && (
              <div className="text-[11px] text-amber-400/90 bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/20 text-center leading-relaxed">
                Notice: Real email delivery requires SMTP or Resend credentials in server settings.
              </div>
            )}
          </div>
        )}

        {/* STEP 2: 6-Digit OTP Verification */}
        {step === "otp" && (
          <div className="p-5 pt-2 space-y-4">
            <div className="space-y-1 text-center">
              <h3 className="text-base font-bold text-white tracking-tight">
                Enter verification code
              </h3>
              <p className="text-xs text-slate-400">
                We sent a 6-digit code to <span className="text-indigo-300 font-medium">{email}</span>
              </p>
            </div>

            {infoMessage && (
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2">
                <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>{infoMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-snug">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1 text-center">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 text-center tracking-[0.35em] text-base font-mono font-bold rounded-xl bg-[#0A0A0E] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/40 disabled:text-slate-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <span>Verify OTP</span>
                )}
              </button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                disabled={cooldown > 0 || isLoading}
                onClick={() => handleSendOtp()}
                className="text-[11px] text-slate-400 hover:text-indigo-300 disabled:text-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't receive code? Resend"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Create Profile (Display Name & Unique Username) */}
        {step === "profile" && (
          <div className="p-5 pt-2 space-y-4">
            <div className="space-y-1 text-center">
              <h3 className="text-base font-bold text-white tracking-tight">
                Create your MEYRA AI profile
              </h3>
              <p className="text-xs text-slate-400">
                Set up your public identity for conversations and shared sessions.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-snug">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleCompleteProfile} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Display Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0A0A0E] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-400">
                    Unique Username
                  </label>
                  {usernameStatus.checking ? (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Checking...
                    </span>
                  ) : usernameStatus.available === true ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" /> Available
                    </span>
                  ) : usernameStatus.available === false ? (
                    <span className="text-[10px] text-rose-400">
                      {usernameStatus.message}
                    </span>
                  ) : null}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="username"
                    className={`w-full pl-7 pr-3 py-2 rounded-xl bg-[#0A0A0E] border text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none ${
                      usernameStatus.available === true
                        ? "border-emerald-500/50"
                        : usernameStatus.available === false
                        ? "border-rose-500/50"
                        : "border-white/10 focus:border-indigo-500"
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  3–24 characters: letters, numbers, and underscores only.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || usernameStatus.available === false || username.length < 3}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/40 disabled:text-slate-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Finalizing Account...</span>
                  </>
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
