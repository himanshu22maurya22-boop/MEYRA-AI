import React, { useState, useEffect, useRef } from "react";
import { Logo } from "../brand/Logo";
import { UserProfile } from "../../types";
import { chatStorage } from "../../services/storage";
import { Shield, AlertTriangle, Instagram, ExternalLink } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [clientId, setClientId] = useState<string>(() => {
    return (
      chatStorage.getGoogleClientId() ||
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
      ""
    );
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Sync client ID from backend auth configuration on mount
  useEffect(() => {
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        if (data?.clientId && data.clientId !== clientId) {
          setClientId(data.clientId);
          chatStorage.saveGoogleClientId(data.clientId);
        }
      })
      .catch(() => {});
  }, [clientId]);

  // Initialize Google Identity Services when client ID is available
  useEffect(() => {
    if (!clientId) return;

    const initGsi = () => {
      if (typeof window === "undefined" || !(window as any).google?.accounts?.id) return;

      try {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Render official Google button into container
        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = "";
          (window as any).google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: "filled_blue",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: 280,
          });
        }
      } catch (err) {
        console.warn("Google Identity Services initialization notice:", err);
      }
    };

    if ((window as any).google?.accounts?.id) {
      initGsi();
    } else {
      const interval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(interval);
          initGsi();
        }
      }, 250);
      return () => clearInterval(interval);
    }
  }, [clientId]);

  // Decode JWT payload safely without external libraries
  const parseJwtPayload = (token: string): any => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Failed to parse JWT payload:", e);
      return null;
    }
  };

  const handleGoogleCredentialResponse = (response: any) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!response.credential) {
        throw new Error("No credential received from Google Sign-In.");
      }

      const payload = parseJwtPayload(response.credential);
      if (!payload || !payload.sub) {
        throw new Error("Failed to decode user profile from Google credential.");
      }

      const user: UserProfile = {
        id: `google_${payload.sub}`,
        name: payload.name || payload.given_name || "Google User",
        email: payload.email || "",
        photoUrl: payload.picture,
        provider: "google",
        lastLoginAt: Date.now(),
        authToken: response.credential,
      };

      chatStorage.saveUser(user);
      onLoginSuccess(user);
    } catch (err) {
      setErrorMessage("Google authentication could not be completed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueWithGoogle = () => {
    setErrorMessage(null);
    setIsLoading(true);

    const activeClientId = clientId || chatStorage.getGoogleClientId();

    if (typeof window !== "undefined" && (window as any).google?.accounts?.oauth2 && activeClientId) {
      try {
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: "openid email profile",
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              if (tokenResponse.error === "popup_closed_by_user") {
                setErrorMessage("Sign-in popup was closed. Please click below to try again.");
              } else {
                setErrorMessage("Google Sign-In could not be completed. Please try again.");
              }
              setIsLoading(false);
              return;
            }

            try {
              // Fetch user profile from Google userinfo endpoint using access token
              const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });

              if (!userInfoRes.ok) {
                throw new Error(`Failed to retrieve profile: HTTP ${userInfoRes.status}`);
              }

              const userInfo = await userInfoRes.json();
              const user: UserProfile = {
                id: `google_${userInfo.sub}`,
                name: userInfo.name || "Google User",
                email: userInfo.email || "",
                photoUrl: userInfo.picture,
                provider: "google",
                lastLoginAt: Date.now(),
                authToken: tokenResponse.access_token,
              };

              chatStorage.saveUser(user);
              onLoginSuccess(user);
            } catch (fetchErr) {
              setErrorMessage("Unable to load Google profile. Please try again.");
            } finally {
              setIsLoading(false);
            }
          },
          error_callback: (err: any) => {
            const raw = (err?.type || err?.message || "").toLowerCase();
            if (raw.includes("popup_closed")) {
              setErrorMessage("Sign-in was cancelled. Please click below to try again.");
            } else {
              setErrorMessage("Google Sign-In encountered an issue. Please try again.");
            }
            setIsLoading(false);
          },
        });

        tokenClient.requestAccessToken({ prompt: "select_account" });
      } catch (err) {
        // Fallback to Google prompt
        try {
          (window as any).google?.accounts?.id?.prompt((notification: any) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              setErrorMessage("Google Sign-In was dismissed. Please click below to try again.");
              setIsLoading(false);
            }
          });
        } catch (e) {
          setErrorMessage("Google Sign-In failed to initialize. Please try again.");
          setIsLoading(false);
        }
      }
    } else if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt();
      setIsLoading(false);
    } else {
      setErrorMessage("Google Sign-In is loading. Please try again in a moment.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-screen flex flex-col items-center justify-between bg-[#0A0A0B] text-slate-100 overflow-y-auto px-4 py-8">
      {/* Ambient background lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-indigo-900/10 blur-[100px] rounded-full" />
      </div>

      {/* Top Bar - Clean branding only */}
      <div className="relative z-10 w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size="sm" />
          <span className="font-bold text-white tracking-wide text-sm">MEYRA AI</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md my-auto flex flex-col items-center text-center">
        {/* Animated Brand Emblem */}
        <div className="mb-6 relative">
          <div className="p-4 rounded-3xl bg-gradient-to-b from-[#1c1c24] to-[#121217] border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
            <Logo size="lg" animated />
          </div>
          <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-semibold text-indigo-300 backdrop-blur-sm">
            v1.0
          </div>
        </div>

        {/* Headings */}
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          Welcome to MEYRA AI
        </h1>
        <p className="text-sm text-slate-400 font-medium mb-8">
          Your Intelligent AI Companion
        </p>

        {/* Auth Box */}
        <div className="w-full p-6 rounded-2xl bg-[#141419]/90 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center">
          {/* User-friendly notification banner if sign-in fails */}
          {errorMessage && (
            <div className="w-full mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2.5 text-left animate-fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="flex-1 text-[11px] leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Official Google Container for native responsive rendering */}
          <div ref={googleBtnContainerRef} className="empty:hidden mb-3 w-full flex justify-center" />

          {/* Primary "Continue with Google" button */}
          <button
            id="continue-with-google-btn"
            type="button"
            onClick={handleContinueWithGoogle}
            disabled={isLoading}
            className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-white/5 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                {/* Official Google G SVG */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Privacy & Security note */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Official Google Sign-In • Secure &amp; Protected</span>
          </div>
        </div>
      </div>

      {/* Footer & Founder Attribution */}
      <div className="relative z-10 w-full max-w-4xl pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span>Created &amp; Developed by</span>
          <span className="font-semibold text-slate-300">Himanshu Maurya</span>
        </div>

        <a
          href="https://www.instagram.com/meyra_ai_official/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-300 hover:text-pink-200 transition-colors"
        >
          <Instagram className="w-3.5 h-3.5" />
          <span>Instagram: @meyra_ai_official</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>
    </div>
  );
};
