import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  X,
  Activity,
  Cpu,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Server,
  Lock,
} from "lucide-react";
import { UserProfile } from "../../types";
import { fetchAdminStats } from "../../services/api";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const AUTHORIZED_ADMIN = "himanshu22maurya22@gmail.com";

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!currentUser?.authToken) {
        throw new Error(
          "Unauthenticated session. Please sign in with the founder Google account to access administrative controls."
        );
      }
      const data = await fetchAdminStats(currentUser.authToken);
      setStats(data);
    } catch (err: any) {
      setError(err?.message || "Server-side verification failed. Access denied.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (currentUser?.email?.toLowerCase().trim() === AUTHORIZED_ADMIN.toLowerCase() && currentUser?.authToken) {
        loadStats();
      } else if (!currentUser) {
        setError(
          "Authentication Required: You are not signed in. Founder Admin access requires logging in with the verified creator Google account (Himanshu Maurya - himanshu22maurya22@gmail.com)."
        );
        setStats(null);
      } else {
        setError(
          `Access Denied: Currently signed in as "${currentUser.email}". Administrative privileges are restricted to the verified platform founder (Himanshu Maurya - ${AUTHORIZED_ADMIN}).`
        );
        setStats(null);
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#121217] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">MEYRA Founder Admin</h3>
              <p className="text-xs text-slate-400">Server-verified creator & administrative telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-xs font-mono text-slate-300">Verifying Founder session with backend...</p>
          </div>
        )}

        {/* Access Verification Denied / Required */}
        {!loading && error && !stats && (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-3 rounded-full bg-rose-500/20 text-rose-400">
              <Lock className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h4 className="text-sm font-semibold text-white">Founder Authentication Required</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/80 border border-white/5 text-[11px] text-slate-400 max-w-md text-left space-y-1">
              <p className="font-semibold text-slate-300">Security Architecture Notice:</p>
              <p>
                Founder Admin privileges are strictly authorized by the backend server using verified Google authentication tokens. Manual client-side toggles or text inputs cannot grant administrative access.
              </p>
            </div>
          </div>
        )}

        {/* Authenticated Dashboard */}
        {stats && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>System Health</span>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                  {stats.systemHealth}
                </div>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Uptime: {stats.uptimeHuman}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Active AI Engine</span>
                  <Cpu className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-lg font-bold text-white font-mono">Gemini 3 Flash</div>
                <p className="text-[10px] text-indigo-300">
                  {stats.geminiConfigured ? "Direct API Key Configured" : "Proxying via Cloud Run"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Feedbacks / Reports</span>
                  <Mail className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {stats.feedbacksCount}
                </div>
                <p className="text-[10px] text-slate-400">Target: {stats.email}</p>
              </div>
            </div>

            {/* Architecture Info */}
            <div className="p-4 rounded-2xl bg-neutral-900/40 border border-white/5 space-y-2 text-xs">
              <span className="font-semibold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                Cloud Run Backend Bridge
              </span>
              <p className="text-[11px] font-mono text-slate-300 bg-black/50 p-2 rounded-lg break-all">
                {stats.cloudRunBridge}
              </p>
            </div>

            {/* Active Platform Modules */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-white">Active Platform Capabilities</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {stats.activeFeatures.map((feat: string, i: number) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-200 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent User Feedbacks Audit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span>Recent User Reports & Feedbacks</span>
                <button
                  onClick={() => loadStats()}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {stats.recentFeedbacks.length === 0 ? (
                <div className="p-6 rounded-2xl bg-neutral-900/30 text-center text-slate-500 text-xs">
                  No feedback received yet this session.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {stats.recentFeedbacks.map((fb: any) => (
                    <div
                      key={fb.id}
                      className="p-3 rounded-xl bg-neutral-900 border border-white/5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span className="font-semibold text-indigo-300 uppercase">{fb.type}</span>
                        <span>{new Date(fb.receivedAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-200">{fb.message}</p>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <span>User: {fb.userName} ({fb.userEmail})</span>
                        <span>Platform: {fb.platform}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-neutral-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
