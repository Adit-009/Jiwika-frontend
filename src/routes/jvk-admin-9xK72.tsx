import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Lock,
  LogOut,
  CheckCircle2,
  XCircle,
  MapPin,
  Briefcase,
  Clock,
  Loader2,
  ArrowLeft,
  Inbox,
  BadgeCheck,
  AlertCircle,
  Search,
  Eye,
  Copy,
  Check,
  Pause,
  Play,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Calendar,
  FileText,
  ExternalLink,
  Globe,
  Plus,
  ArrowUpRight,
  Edit,
  MessageCircle,
} from "lucide-react";
import type { Job } from "@/lib/mock-data";
import logo from "@/assets/Logo.png";
import {
  getAdminJobs,
  adminVerifyPayment,
  approveJob,
  rejectJob,
  adminPauseJob,
  adminExpireJob,
  adminRestoreJob,
  adminDeleteJob,
  adminPostResult,
  adminEditResult,
  getAdminSettings,
  updateAdminSettings,
} from "@/lib/api/jobs.functions";

export const Route = createFileRoute("/jvk-admin-9xK72")({
  head: (): any => ({
    meta: [
      { title: "Admin Panel — Jiwika" },
      {
        name: "description",
        content: "Admin panel for verifying payments and reviewing job postings.",
      },
    ],
  }),
  component: AdminPage,
});

type StatusFilter =
  | "pending"
  | "active"
  | "rejected"
  | "expired"
  | "post_results"
  | "all"
  | "deleted";

const TABS: { value: StatusFilter; label: string; countColor: string }[] = [
  { value: "pending", label: "Pending Approval", countColor: "bg-purple-500/10 text-purple-500" },
  { value: "active", label: "Published", countColor: "bg-success/10 text-success" },
  { value: "rejected", label: "Rejected", countColor: "bg-destructive/10 text-destructive" },
  { value: "expired", label: "Expired", countColor: "bg-amber-500/10 text-amber-500" },
  {
    value: "post_results",
    label: "📋 Post Results",
    countColor: "bg-emerald-500/10 text-emerald-500",
  },
];

function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Rejection Dialog state
  const [rejectingJob, setRejectingJob] = useState<Job | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Post Results form state
  const [resultTitle, setResultTitle] = useState("");
  const [resultCompany, setResultCompany] = useState("");
  const [resultDepartment, setResultDepartment] = useState("");
  const [resultWebsite, setResultWebsite] = useState("");
  const [resultDeadline, setResultDeadline] = useState("");
  const [resultLoading, setResultLoading] = useState(false);
  const [showPostResultForm, setShowPostResultForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  // Payment configuration states
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [upiId, setUpiId] = useState("jiwika@ybl");
  const [amount, setAmount] = useState(99);
  const [qrCodeImage, setQrCodeImage] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);

  const isActionRunning = useRef(false);

  const handleQrCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Image size must be less than 2MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setQrCodeImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveQrCode = () => {
    setQrCodeImage("");
  };

  const fetchSettings = useCallback(async () => {
    if (!authenticated) return;
    setSettingsLoading(true);
    try {
      const result = await getAdminSettings({ data: { password } });
      if (result.settings) {
        setPaymentsEnabled(result.settings.paymentsEnabled);
        setUpiId(result.settings.upiId);
        setAmount(result.settings.amount);
        setQrCodeImage(result.settings.qrCodeImage || "");
      }
    } catch (err: any) {
      console.error("Failed to fetch admin settings", err);
    } finally {
      setSettingsLoading(false);
    }
  }, [authenticated, password]);

  useEffect(() => {
    if (authenticated) {
      fetchSettings();
    }
  }, [authenticated, fetchSettings]);

  const handleSaveSettings = async () => {
    if (isActionRunning.current) return;
    isActionRunning.current = true;
    setSettingsLoading(true);
    try {
      const result = await updateAdminSettings({
        data: {
          password,
          paymentsEnabled,
          upiId,
          amount,
          qrCodeImage,
        },
      });
      if (result.success) {
        showToast("Payment configurations saved successfully!", "success");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update payment settings", "error");
    } finally {
      setSettingsLoading(false);
      isActionRunning.current = false;
    }
  };

  const handleTogglePayments = async () => {
    if (isActionRunning.current) return;
    isActionRunning.current = true;
    setSettingsLoading(true);
    try {
      const nextVal = !paymentsEnabled;
      const result = await updateAdminSettings({
        data: {
          password,
          paymentsEnabled: nextVal,
          upiId,
          amount,
          qrCodeImage,
        },
      });
      if (result.success) {
        setPaymentsEnabled(nextVal);
        showToast(`Payment mode switched to ${nextVal ? "PAID" : "FREE"}!`, "success");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to toggle payment mode", "error");
    } finally {
      setSettingsLoading(false);
      isActionRunning.current = false;
    }
  };
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "expire";
    jobId: string;
    title: string;
    company: string;
  } | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchJobs = useCallback(async (pwd: string, filter: StatusFilter, search: string) => {
    // post_results tab now fetches government results from the API
    setLoading(true);
    try {
      const result = await getAdminJobs({
        data: { password: pwd, statusFilter: filter, searchQuery: search },
      });
      setJobs(result.jobs);
    } catch (err: any) {
      showToast(err.message || "Failed to fetch jobs", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch jobs on filter or search changes
  useEffect(() => {
    if (authenticated) {
      fetchJobs(password, statusFilter, debouncedSearch);
    }
  }, [authenticated, statusFilter, debouncedSearch, password, fetchJobs]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      // Validate credentials by attempting to load jobs
      const result = await getAdminJobs({
        data: { password, statusFilter, searchQuery: debouncedSearch },
      });
      setAuthenticated(true);
      setJobs(result.jobs);
    } catch {
      setAuthError("Invalid password. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyPayment = async (jobId: string) => {
    if (isActionRunning.current) return;
    isActionRunning.current = true;
    setActionLoading(jobId);
    try {
      await adminVerifyPayment({ data: { password, jobId } });
      setJobs((prev) => prev.filter((j) => j.jobId !== jobId && j.id !== jobId));
      showToast("Payment verified! Job moved to Pending Approval.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to verify payment", "error");
    } finally {
      setActionLoading(null);
      isActionRunning.current = false;
    }
  };

  const handleApprove = async (jobId: string) => {
    if (isActionRunning.current) return;
    isActionRunning.current = true;
    setActionLoading(jobId);
    try {
      await approveJob({ data: { password, jobId } });
      setJobs((prev) => prev.filter((j) => j.jobId !== jobId && j.id !== jobId));
      showToast("Job approved and published!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to approve job", "error");
    } finally {
      setActionLoading(null);
      isActionRunning.current = false;
    }
  };

  const handleRejectPrompt = (job: Job) => {
    setRejectingJob(job);
    setRejectionReason("");
  };

  const handleRejectSubmit = async () => {
    if (!rejectingJob) return;
    if (isActionRunning.current) return;
    isActionRunning.current = true;
    const targetId = rejectingJob.jobId || rejectingJob.id;
    setActionLoading(targetId);
    try {
      await rejectJob({
        data: { password, jobId: targetId, reason: rejectionReason },
      });
      setJobs((prev) => prev.filter((j) => j.jobId !== targetId && j.id !== targetId));
      setRejectingJob(null);
      showToast("Job submission rejected.", "error");
    } catch (err: any) {
      showToast(err.message || "Failed to reject job", "error");
    } finally {
      setActionLoading(null);
      isActionRunning.current = false;
    }
  };

  const handleTogglePause = async (jobId: string, paused: boolean) => {
    if (isActionRunning.current) return;
    isActionRunning.current = true;
    setActionLoading(jobId);
    try {
      await adminPauseJob({ data: { password, jobId, paused } });
      // Refresh current tab
      fetchJobs(password, statusFilter, debouncedSearch);
      showToast(paused ? "Job listing paused." : "Job listing resumed.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to toggle pause status", "error");
    } finally {
      setActionLoading(null);
      isActionRunning.current = false;
    }
  };

  const executeExpire = async (jobId: string) => {
    if (isActionRunning.current) return;
    isActionRunning.current = true;
    setActionLoading(jobId);
    try {
      await adminExpireJob({ data: { password, jobId } });
      setJobs((prev) => prev.filter((j) => j.jobId !== jobId && j.id !== jobId));
      showToast("Job listing marked as expired.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to expire job", "error");
    } finally {
      setActionLoading(null);
      isActionRunning.current = false;
    }
  };

  const handleExpire = (jobId: string) => {
    const job = jobs.find((j) => j.jobId === jobId || j.id === jobId);
    setConfirmAction({
      type: "expire",
      jobId,
      title: job?.title || "this job",
      company: job?.company || "Employer",
    });
  };

  const handleRestore = async (jobId: string) => {
    if (isActionRunning.current) return;
    isActionRunning.current = true;
    setActionLoading(jobId);
    try {
      await adminRestoreJob({ data: { password, jobId } });
      setJobs((prev) => prev.filter((j) => j.jobId !== jobId && j.id !== jobId));
      showToast("Job listing restored successfully.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to restore job", "error");
    } finally {
      setActionLoading(null);
      isActionRunning.current = false;
    }
  };

  const executeDelete = async (jobId: string) => {
    if (isActionRunning.current) return;
    isActionRunning.current = true;
    setActionLoading(jobId);
    try {
      await adminDeleteJob({ data: { password, jobId } });
      setJobs((prev) => prev.filter((j) => j.jobId !== jobId && j.id !== jobId));
      showToast("Job listing deleted.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to delete job", "error");
    } finally {
      setActionLoading(null);
      isActionRunning.current = false;
    }
  };

  const handleDelete = (jobId: string) => {
    const job = jobs.find((j) => j.jobId === jobId || j.id === jobId);
    setConfirmAction({
      type: "delete",
      jobId,
      title: job?.title || "this job",
      company: job?.company || "Employer",
    });
  };

  const handleEditClick = (job: Job) => {
    setEditingJobId(job.jobId || job.id);
    setResultTitle(job.title);
    setResultCompany(job.company);
    setResultDepartment(job.department || "");
    setResultWebsite(job.officialWebsite || job.officialApplyLink || "");
    // Check if deadline is a valid date string or not, clean it if it is "See Notice"
    setResultDeadline(
      job.deadline && job.deadline !== "See Notice" && !isNaN(Date.parse(job.deadline))
        ? new Date(job.deadline).toISOString().split("T")[0]
        : "",
    );
    setShowPostResultForm(true);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleToggleForm = () => {
    if (showPostResultForm) {
      // Closing: reset everything
      setResultTitle("");
      setResultCompany("");
      setResultDepartment("");
      setResultWebsite("");
      setResultDeadline("");
      setEditingJobId(null);
    }
    setShowPostResultForm(!showPostResultForm);
  };

  const handlePostResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultTitle.trim() || !resultCompany.trim() || !resultWebsite.trim()) {
      showToast("Please fill in all required fields.", "error");
      return;
    }
    setResultLoading(true);
    try {
      if (editingJobId) {
        // Edit mode
        const res = await adminEditResult({
          data: {
            password,
            jobId: editingJobId,
            title: resultTitle.trim(),
            companyName: resultCompany.trim(),
            department: resultDepartment.trim() || undefined,
            officialWebsite: resultWebsite.trim(),
            deadline: resultDeadline.trim() || undefined,
          },
        });
        showToast(res.message || "Result updated successfully!", "success");
      } else {
        // Create mode
        const res = await adminPostResult({
          data: {
            password,
            title: resultTitle.trim(),
            companyName: resultCompany.trim(),
            department: resultDepartment.trim() || undefined,
            officialWebsite: resultWebsite.trim(),
            deadline: resultDeadline.trim() || undefined,
          },
        });
        showToast(res.message || "Result posted successfully!", "success");
      }
      // Reset form and close it
      setResultTitle("");
      setResultCompany("");
      setResultDepartment("");
      setResultWebsite("");
      setResultDeadline("");
      setEditingJobId(null);
      setShowPostResultForm(false);
      // Refresh the results list
      fetchJobs(password, "post_results", debouncedSearch);
    } catch (err: any) {
      showToast(err.message || "Failed to submit result", "error");
    } finally {
      setResultLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setPassword("");
    setJobs([]);
    setAuthError("");
  };

  const copyManagementUrl = (token: string) => {
    const url = `${window.location.origin}/manage/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Header */}
      <header className="w-full bg-transparent z-30 relative">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-8 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-4 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-6 w-6 shrink-0 " />
            <img
              src={logo}
              alt="Jiwika"
              className="h-16 sm:h-18 w-auto object-contain -my-4 sm:-my-8 mr-10"
            />
            <span className="text-xs font-semibold text-muted-foreground bg-muted/80 border border-border px-2 py-0.5 rounded-md ml-1 shrink-0">
              Admin
            </span>
          </Link>
          {authenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-card transition hover:border-destructive/40 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6">
        <AnimatePresence mode="wait">
          {!authenticated ? (
            /* ─── Login Gate ─── */
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex min-h-[60vh] items-center justify-center"
            >
              <div className="w-full max-w-sm">
                <div className="text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-float">
                    <Shield className="h-8 w-8" />
                  </div>
                  <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Admin Panel</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Enter your admin password to manage job postings.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="mt-8 space-y-4">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setAuthError("");
                      }}
                      placeholder="Admin password"
                      className="input pl-10"
                      autoFocus
                    />
                  </div>
                  {authError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {authError}
                    </motion.div>
                  )}
                  <button
                    type="submit"
                    disabled={!password || authLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-60"
                  >
                    {authLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    {authLoading ? "Verifying..." : "Sign In"}
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            /* ─── Admin Dashboard ─── */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Title & Refresh */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight">Dashboard Overview</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Review payments, verify contents, and manage listings.
                  </p>
                </div>

                <div className="flex gap-2">
                  {/* Search bar */}
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ID, Company, District, WhatsApp..."
                      className="input pl-9 text-xs py-2 h-9.5 rounded-lg"
                    />
                  </div>

                  <button
                    onClick={() => fetchJobs(password, statusFilter, debouncedSearch)}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted transition disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 text-primary ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Payment Settings Panel */}
              <div className="rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-soft">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      💳 Payment Settings
                      {settingsLoading && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      )}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure manual UPI payments. Switch between Free and Paid mode.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${paymentsEnabled ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-success/15 text-success border border-success/20"}`}
                    >
                      {paymentsEnabled ? `Paid Mode (₹${amount})` : "Free Mode"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-3.5 border-t border-border/40 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Payment Mode
                    </label>
                    <button
                      onClick={handleTogglePayments}
                      disabled={settingsLoading}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition h-8.5 ${paymentsEnabled
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-600 hover:bg-amber-500/20"
                        : "bg-success/10 border-success/20 text-success hover:bg-success/20"
                        }`}
                    >
                      {paymentsEnabled ? "🔴 Switch to Free Mode" : "🟢 Switch to Paid Mode"}
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      UPI ID for QR
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. jiwika@ybl"
                      className="input py-1.5 px-3 text-xs rounded-xl h-8.5"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Fee Amount (INR)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      placeholder="e.g. 99"
                      className="input py-1.5 px-3 text-xs rounded-xl h-8.5"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Custom QR Code Image
                    </label>
                    <div className="flex items-center gap-2 h-8.5">
                      {qrCodeImage ? (
                        <div className="flex items-center gap-2 bg-secondary/15 rounded-xl border border-border px-2 py-1 w-full justify-between">
                          <img
                            src={qrCodeImage}
                            alt="QR Preview"
                            className="h-6 w-6 object-contain rounded border border-border/80 bg-white"
                          />
                          <button
                            onClick={handleRemoveQrCode}
                            className="text-[10px] text-destructive hover:underline font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center border border-dashed border-border hover:border-primary/45 rounded-xl cursor-pointer py-1.5 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition w-full h-full bg-card">
                          <span>Upload QR Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleQrCodeChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={settingsLoading}
                    className="rounded-xl bg-primary text-primary-foreground hover:opacity-95 px-6 py-2 text-xs font-bold shadow-soft transition"
                  >
                    Save Configuration
                  </button>
                </div>
              </div>

              {/* Status Tab Filters */}
              <div className="flex flex-wrap gap-1.5 bg-[#F1F5F9] dark:bg-[#1E293B]/60 p-1.5 rounded-[18px] border border-[#E2E8F0] dark:border-border/40">
                {TABS.map((tab) => {
                  const isActive = statusFilter === tab.value;
                  let activeColors = "bg-primary text-white";
                  if (tab.value === "pending") activeColors = "bg-[#7C3AED] text-white shadow-sm";
                  else if (tab.value === "active")
                    activeColors = "bg-[#0F8B6D] text-white shadow-sm";
                  else if (tab.value === "rejected")
                    activeColors = "bg-red-600 text-white shadow-sm";
                  else if (tab.value === "expired")
                    activeColors = "bg-amber-500 text-white shadow-sm";
                  else if (tab.value === "post_results")
                    activeColors = "bg-[#10B981] text-white shadow-sm";

                  return (
                    <button
                      key={tab.value}
                      onClick={() => setStatusFilter(tab.value)}
                      className={`px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all duration-200 ${isActive
                        ? activeColors
                        : "text-[#6B7280] hover:text-[#111827] hover:bg-white/50 dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-white/5"
                        }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* ── Post Results Section ── */}
              {statusFilter === "post_results" ? (
                <div className="space-y-5">
                  {/* Header with Post New Results button */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <FileText className="h-3.5 w-3.5" />
                      {jobs.length} result{jobs.length !== 1 ? "s" : ""} published
                    </span>
                    <button
                      onClick={handleToggleForm}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-soft transition ${showPostResultForm
                        ? "border border-border bg-card hover:bg-muted text-foreground"
                        : "bg-gradient-primary text-primary-foreground hover:opacity-95"
                        }`}
                    >
                      {showPostResultForm ? (
                        <>
                          <XCircle className="h-4 w-4" />
                          {editingJobId ? "Cancel Edit" : "Close Form"}
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          📋 Post New Results
                        </>
                      )}
                    </button>
                  </div>

                  {/* Post Result Form (collapsible) */}
                  <AnimatePresence>
                    {showPostResultForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mx-auto w-full max-w-2xl">
                          <div className="rounded-3xl border border-emerald-500/30 bg-card p-6 sm:p-8 shadow-card">
                            {/* Form Header */}
                            <div className="flex items-center gap-3 mb-6">
                              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10">
                                <FileText className="h-5.5 w-5.5 text-emerald-500" />
                              </div>
                              <div>
                                <h2 className="text-lg font-extrabold tracking-tight">
                                  {editingJobId ? "Edit Job Results" : "Post Job Results"}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                  {editingJobId
                                    ? "Modify result details visible in the public Results section."
                                    : "Create a result entry visible in the public Results section."}
                                </p>
                              </div>
                            </div>

                            <form onSubmit={handlePostResult} className="space-y-4">
                              {/* Title */}
                              <div>
                                <label className="block text-xs font-bold text-foreground mb-1.5">
                                  Result Title <span className="text-destructive">*</span>
                                </label>
                                <input
                                  value={resultTitle}
                                  onChange={(e) => setResultTitle(e.target.value)}
                                  placeholder="e.g. APSC CCE 2024 Results"
                                  className="input text-sm"
                                  required
                                />
                              </div>

                              {/* Organization */}
                              <div>
                                <label className="block text-xs font-bold text-foreground mb-1.5">
                                  Organization / Department Name{" "}
                                  <span className="text-destructive">*</span>
                                </label>
                                <input
                                  value={resultCompany}
                                  onChange={(e) => setResultCompany(e.target.value)}
                                  placeholder="e.g. Assam Public Service Commission"
                                  className="input text-sm"
                                  required
                                />
                              </div>

                              {/* Department */}
                              <div>
                                <label className="block text-xs font-bold text-foreground mb-1.5">
                                  Department{" "}
                                  <span className="text-muted-foreground font-normal">
                                    (Optional)
                                  </span>
                                </label>
                                <input
                                  value={resultDepartment}
                                  onChange={(e) => setResultDepartment(e.target.value)}
                                  placeholder="e.g. Civil Services"
                                  className="input text-sm"
                                />
                              </div>

                              {/* Official Website URL */}
                              <div>
                                <label className="block text-xs font-bold text-foreground mb-1.5">
                                  Official Website URL <span className="text-destructive">*</span>
                                </label>
                                <div className="relative">
                                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <input
                                    value={resultWebsite}
                                    onChange={(e) => setResultWebsite(e.target.value)}
                                    placeholder="https://apsc.nic.in"
                                    className="input pl-9 text-sm"
                                    required
                                  />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Users will be redirected to this URL to view the results.
                                </p>
                              </div>

                              {/* Result Date */}
                              <div>
                                <label className="block text-xs font-bold text-foreground mb-1.5">
                                  Result / Last Date{" "}
                                  <span className="text-muted-foreground font-normal">
                                    (Optional)
                                  </span>
                                </label>
                                <div className="relative">
                                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <input
                                    type="date"
                                    value={resultDeadline}
                                    onChange={(e) => setResultDeadline(e.target.value)}
                                    className="input pl-9 text-sm"
                                  />
                                </div>
                              </div>

                              {/* Submit */}
                              <div className="pt-2">
                                <button
                                  type="submit"
                                  disabled={
                                    resultLoading ||
                                    !resultTitle.trim() ||
                                    !resultCompany.trim() ||
                                    !resultWebsite.trim()
                                  }
                                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-60"
                                >
                                  {resultLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : editingJobId ? (
                                    <Edit className="h-4 w-4" />
                                  ) : (
                                    <ExternalLink className="h-4 w-4" />
                                  )}
                                  {resultLoading
                                    ? editingJobId
                                      ? "Updating Result..."
                                      : "Posting Result..."
                                    : editingJobId
                                      ? "Update Result"
                                      : "Post Result"}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Loader */}
                  {loading && (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}

                  {/* Published Results Listing */}
                  {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AnimatePresence mode="popLayout">
                        {jobs.map((job, i) => (
                          <motion.div
                            key={job.id}
                            layout
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                            transition={{ duration: 0.25, delay: i * 0.03 }}
                            className="rounded-2xl border border-emerald-500/20 bg-card p-4 sm:p-5 shadow-card hover:shadow-soft transition flex flex-col justify-between"
                          >
                            <div>
                              {/* Result Card Header */}
                              <div className="flex items-start gap-3">
                                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 shrink-0">
                                  <span className="text-lg">🏛</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm font-bold text-foreground truncate">
                                    {job.title}
                                  </h3>
                                  <p className="text-xs text-muted-foreground mt-0.5 font-semibold truncate">
                                    {job.company}
                                  </p>
                                  {job.department && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                      {job.department}
                                    </p>
                                  )}
                                </div>
                                <span className="shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  📋 Result
                                </span>
                              </div>

                              {/* Meta info */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[10px] text-muted-foreground">
                                {job.deadline && job.deadline !== "See Notice" && (
                                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                                    <Calendar className="h-3 w-3" />
                                    {isNaN(Date.parse(job.deadline))
                                      ? job.deadline
                                      : new Date(job.deadline).toLocaleDateString("en-US", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                  </span>
                                )}
                                {job.publishedAt && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Posted{" "}
                                    {new Date(job.publishedAt).toLocaleDateString("en-US", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
                              <button
                                onClick={() => handleEditClick(job)}
                                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[10px] font-semibold hover:bg-muted transition text-foreground"
                              >
                                <Edit className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(job.jobId || job.id)}
                                disabled={actionLoading === (job.jobId || job.id)}
                                className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-[10px] font-semibold text-destructive hover:bg-destructive/10 transition disabled:opacity-60 ml-auto"
                              >
                                {actionLoading === (job.jobId || job.id) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                                Delete
                              </button>
                            </div>
                          </motion.div>
                        ))}

                        {/* Empty State */}
                        {jobs.length === 0 && (
                          <motion.div
                            key="empty-results"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full flex flex-col items-center justify-center py-20 text-center"
                          >
                            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 mb-4">
                              <FileText className="h-8 w-8 text-emerald-500/60" />
                            </div>
                            <h3 className="text-sm font-bold text-foreground">
                              No results posted yet
                            </h3>
                            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                              Click the "📋 Post New Results" button above to publish government job
                              results.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Total count indicator */}
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                      <Clock className="h-3.5 w-3.5" />
                      {jobs.length} job{jobs.length !== 1 ? "s" : ""} found in this view
                    </span>
                  </div>

                  {/* Loader */}
                  {loading && (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}

                  {/* Job Grid / List */}
                  {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AnimatePresence mode="popLayout">
                        {jobs.map((job, i) => (
                          <motion.div
                            key={job.id}
                            layout
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                            transition={{ duration: 0.25, delay: i * 0.03 }}
                            className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-card hover:shadow-soft transition flex flex-col justify-between w-full max-w-[340px] sm:max-w-none mx-auto sm:mx-0"
                          >
                            <div>
                              {/* Card Header */}
                              <div className="flex items-start gap-3">
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm font-bold text-foreground truncate">
                                    {job.title}
                                  </h3>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                    <span className="font-semibold truncate">{job.company}</span>
                                    {job.verified && (
                                      <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3 shrink-0" />
                                      <span className="truncate">
                                        {job.location}, {job.district}
                                      </span>
                                    </span>
                                    {job.deadline && (
                                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold shrink-0">
                                        <Calendar className="h-3 w-3 shrink-0" />
                                        <span>
                                          {job.jobType === "government"
                                            ? "Last Date: "
                                            : "Deadline: "}
                                          {isNaN(Date.parse(job.deadline))
                                            ? job.deadline
                                            : new Date(job.deadline).toLocaleDateString("en-US", {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                            })}
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Quick Spec Tags */}
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {(job.jobType || "private") === "government" ? (
                                  <span className="rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 text-[10px] font-bold text-yellow-600">
                                    🏛 Government
                                  </span>
                                ) : (
                                  <>
                                    <span className="rounded-full bg-blue-500/10 border border-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                                      🏢 Private
                                    </span>
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                      {job.type}
                                    </span>
                                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                                      {job.experience}
                                    </span>
                                  </>
                                )}
                                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                                  {job.salary}
                                </span>
                                {job.jobId && (
                                  <span className="rounded-full bg-card border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground font-semibold">
                                    {job.jobId}
                                  </span>
                                )}
                              </div>

                              {/* Details Accordion style display */}
                              <div className="mt-4 rounded-xl border border-border/50 bg-secondary/10 p-3 text-xs space-y-2">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Listing Info
                                </p>

                                {(job.jobType || "private") === "government" ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1.5">
                                    <div>
                                      <span className="text-muted-foreground text-[10px]">
                                        Department:
                                      </span>
                                      <span className="font-medium text-foreground block truncate">
                                        {job.department || "N/A"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground text-[10px]">
                                        Official Website:
                                      </span>
                                      <span className="font-medium text-foreground block truncate text-primary hover:underline">
                                        <a
                                          href={
                                            job.officialWebsite?.startsWith("http")
                                              ? job.officialWebsite
                                              : `https://${job.officialWebsite}`
                                          }
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          {job.officialWebsite || "N/A"}
                                        </a>
                                      </span>
                                    </div>
                                    {job.deadline && (
                                      <div className="sm:col-span-2">
                                        <span className="text-muted-foreground text-[10px]">
                                          Last Date to Apply:
                                        </span>
                                        <span className="font-medium text-foreground block truncate">
                                          {isNaN(Date.parse(job.deadline))
                                            ? job.deadline
                                            : new Date(job.deadline).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                                    <div>
                                      <span className="text-muted-foreground text-[10px]">
                                        HR Details:
                                      </span>
                                      <span className="font-medium text-foreground block truncate">
                                        {job.hrName || "N/A"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground text-[10px]">
                                        HR Email:
                                      </span>
                                      <span className="font-medium text-foreground block truncate">
                                        {job.email || job.contactEmail || "N/A"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground text-[10px]">
                                        WhatsApp:
                                      </span>
                                      <span className="font-medium text-foreground block truncate">
                                        {job.whatsapp || job.whatsappNumber || "N/A"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground text-[10px]">
                                        Vacancies:
                                      </span>
                                      <span className="font-medium text-foreground block">
                                        {job.vacancies || "N/A"}
                                      </span>
                                    </div>
                                    {job.deadline && (
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground text-[10px]">
                                          Application Deadline:
                                        </span>
                                        <span className="font-medium text-foreground block">
                                          {isNaN(Date.parse(job.deadline))
                                            ? job.deadline
                                            : new Date(job.deadline).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {job.upiTxnId && (
                                  <div className="mt-2 border-t border-blue-500/20 pt-2 text-blue-600 dark:text-blue-400">
                                    <span className="font-bold block text-[9px] uppercase tracking-wide">
                                      UPI Transaction ID (UTR):
                                    </span>
                                    <p className="mt-0.5 font-mono font-bold select-all bg-blue-500/5 px-2.5 py-1 rounded border border-blue-500/10 w-fit">
                                      {job.upiTxnId}
                                    </p>
                                  </div>
                                )}

                                {job.rejectedReason && job.status === "rejected" && (
                                  <div className="mt-2 border-t border-destructive/20 pt-2 text-destructive">
                                    <span className="font-bold block text-[9px] uppercase tracking-wide">
                                      Rejection Reason:
                                    </span>
                                    <p className="mt-0.5 font-medium leading-relaxed">
                                      {job.rejectedReason}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Management Link display */}
                              {job.managementToken && (
                                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-card border border-border/70 p-2.5 text-xs font-mono">
                                  <span className="text-[10px] text-muted-foreground truncate flex-1 select-all">
                                    .../manage/{job.managementToken.substring(0, 12)}...
                                  </span>
                                  <div className="flex gap-1 shrink-0">
                                    <a
                                      href={`/manage/${job.managementToken}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                      title="View Management Link"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </a>
                                    <button
                                      onClick={() => copyManagementUrl(job.managementToken)}
                                      className="flex items-center justify-center p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                      title="Copy Link"
                                    >
                                      {copiedToken === job.managementToken ? (
                                        <Check className="h-3.5 w-3.5 text-success" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Action Bar */}
                            <div className="mt-5 pt-3.5 border-t border-border/40 flex flex-wrap gap-2">
                              {/* Pending Approval Actions */}
                              {statusFilter === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleRejectPrompt(job)}
                                    disabled={actionLoading === (job.jobId || job.id)}
                                    className="flex items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 px-2.5 py-1.5 text-[11px] font-bold transition disabled:opacity-60 flex-1 shadow-card"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => handleApprove(job.jobId || job.id)}
                                    disabled={actionLoading === (job.jobId || job.id)}
                                    className="flex items-center justify-center gap-1.5 rounded-xl bg-success text-success-foreground hover:opacity-90 px-2.5 py-1.5 text-[11px] font-bold shadow-soft transition disabled:opacity-60 flex-1"
                                  >
                                    {actionLoading === (job.jobId || job.id) ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    )}
                                    Approve & Publish
                                  </button>
                                </>
                              )}

                              {/* Published Actions */}
                              {statusFilter === "active" && (
                                <>
                                  {/* Pause Toggle */}
                                  <button
                                    onClick={() =>
                                      handleTogglePause(job.jobId || job.id, !job.paused)
                                    }
                                    disabled={actionLoading === (job.jobId || job.id)}
                                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition disabled:opacity-60 flex-1 shadow-card ${job.paused
                                      ? "border-success/30 bg-success/5 text-success hover:bg-success/10"
                                      : "border-border bg-card text-foreground hover:bg-muted"
                                      }`}
                                  >
                                    {job.paused ? (
                                      <>
                                        <Play className="h-3.5 w-3.5" />
                                        Resume
                                      </>
                                    ) : (
                                      <>
                                        <Pause className="h-3.5 w-3.5" />
                                        Pause
                                      </>
                                    )}
                                  </button>

                                  {/* Expire Listing */}
                                  <button
                                    onClick={() => handleExpire(job.jobId || job.id)}
                                    disabled={actionLoading === (job.jobId || job.id)}
                                    className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10 px-3 py-2 text-xs font-bold transition disabled:opacity-60 flex-1 shadow-card"
                                  >
                                    <Clock className="h-3.5 w-3.5" />
                                    Expire
                                  </button>
                                </>
                              )}

                              {/* Restore action for Expired, Rejected tabs */}
                              {(statusFilter === "expired" || statusFilter === "rejected") && (
                                <button
                                  onClick={() => handleRestore(job.jobId || job.id)}
                                  disabled={actionLoading === (job.jobId || job.id)}
                                  className="flex items-center justify-center gap-1.5 rounded-xl bg-success text-success-foreground hover:opacity-90 px-3.5 py-2 text-xs font-bold shadow-soft transition disabled:opacity-60 flex-1"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  Restore Listing
                                </button>
                              )}

                              {/* Contact button for Rejected tab */}
                              {statusFilter === "rejected" &&
                                (() => {
                                  if (job.jobType === "government") return null;

                                  const hrEmail = job.email || job.contactEmail;
                                  const hrWhatsapp = job.whatsapp || job.whatsappNumber;
                                  const method = job.applicationMethod || "whatsapp";

                                  const getEmailLink = () => {
                                    const subject = encodeURIComponent(
                                      "Regarding your Jiwika Job Post Rejection",
                                    );
                                    const body = encodeURIComponent(
                                      `Hi ${job.hrName || "Employer"},\n\nWe regret to inform you that your job listing titled "${job.title}" has been rejected.\n\nReason for Rejection:\n${job.rejectedReason || "Does not comply with posting guidelines"}\n\nYou can submit a new job posting or contact our support team if you have any questions.\n\nBest regards,\nJiwika Team`,
                                    );
                                    return `mailto:${hrEmail}?subject=${subject}&body=${body}`;
                                  };

                                  const getWhatsappLink = () => {
                                    const cleanedPhone = hrWhatsapp!.replace(/\D/g, "");
                                    const formattedPhone =
                                      cleanedPhone.length === 10
                                        ? `91${cleanedPhone}`
                                        : cleanedPhone;
                                    const text = encodeURIComponent(
                                      `Hi ${job.hrName || "Employer"},\n\nWe regret to inform you that your job listing titled *${job.title}* has been rejected.\n\n*Reason for Rejection:*\n${job.rejectedReason || "Does not comply with posting guidelines"}\n\nBest regards,\nJiwika Team`,
                                    );
                                    return `https://wa.me/${formattedPhone}?text=${text}`;
                                  };

                                  // If both are selected and both details are available, show both contact buttons!
                                  if (method === "both" && hrWhatsapp && hrEmail) {
                                    return (
                                      <>
                                        <a
                                          href={getWhatsappLink()}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 px-3 py-2 text-xs font-bold transition flex-1 min-w-[100px]"
                                        >
                                          <MessageCircle className="h-3.5 w-3.5" />
                                          WhatsApp
                                        </a>
                                        <a
                                          href={getEmailLink()}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 px-3 py-2 text-xs font-bold transition flex-1 min-w-[100px]"
                                        >
                                          <Globe className="h-3.5 w-3.5" />
                                          Email
                                        </a>
                                      </>
                                    );
                                  }

                                  // Otherwise, show based on method preferred
                                  if (method === "email" && hrEmail) {
                                    return (
                                      <a
                                        href={getEmailLink()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 px-3.5 py-2 text-xs font-bold transition flex-1"
                                      >
                                        <Globe className="h-3.5 w-3.5" />
                                        Contact via Email
                                      </a>
                                    );
                                  }

                                  if (method === "whatsapp" && hrWhatsapp) {
                                    return (
                                      <a
                                        href={getWhatsappLink()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 px-3.5 py-2 text-xs font-bold transition flex-1"
                                      >
                                        <MessageCircle className="h-3.5 w-3.5" />
                                        Contact via WhatsApp
                                      </a>
                                    );
                                  }

                                  // Fallbacks if preferred is not available but the other is
                                  if (hrWhatsapp) {
                                    return (
                                      <a
                                        href={getWhatsappLink()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 px-3.5 py-2 text-xs font-bold transition flex-1"
                                      >
                                        <MessageCircle className="h-3.5 w-3.5" />
                                        Contact via WhatsApp
                                      </a>
                                    );
                                  }

                                  if (hrEmail) {
                                    return (
                                      <a
                                        href={getEmailLink()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 px-3.5 py-2 text-xs font-bold transition flex-1"
                                      >
                                        <Globe className="h-3.5 w-3.5" />
                                        Contact via Email
                                      </a>
                                    );
                                  }

                                  return (
                                    <button
                                      disabled
                                      className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 text-muted-foreground px-3.5 py-2 text-xs font-bold cursor-not-allowed flex-1"
                                    >
                                      No Contact Details
                                    </button>
                                  );
                                })()}

                              {/* Delete Action */}
                              <button
                                onClick={() => handleDelete(job.jobId || job.id)}
                                disabled={actionLoading === (job.jobId || job.id)}
                                className="flex items-center justify-center p-2 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 transition disabled:opacity-60"
                                title="Delete Listing"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* Empty State */}
                      {jobs.length === 0 && !loading && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="col-span-1 md:col-span-2 flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/50 py-16 text-center"
                        >
                          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-success/10">
                            <Inbox className="h-8 w-8 text-success" />
                          </div>
                          <h3 className="mt-4 text-lg font-bold">No jobs here</h3>
                          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                            There are no job postings in this view. Try checking other status tabs
                            or adjusting your search queries.
                          </p>
                        </motion.div>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Reject Confirmation Dialog */}
      <AnimatePresence>
        {rejectingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-float border border-border">
              <div className="flex items-center gap-2 text-destructive mb-3">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-lg font-bold">Reject Job Submission</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to reject the job post by{" "}
                <strong>{rejectingJob.company}</strong>?
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setRejectingJob(null)}
                  className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold hover:bg-muted w-full"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={actionLoading === (rejectingJob.jobId || rejectingJob.id)}
                  className="rounded-xl bg-destructive text-destructive-foreground hover:opacity-90 px-4 py-2.5 text-xs font-semibold shadow-soft w-full disabled:opacity-60"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation (Delete / Expire) Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-card p-6 shadow-float border border-border"
            >
              <div className="flex items-center gap-2 text-destructive mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-bold text-foreground">
                  {confirmAction.type === "delete" ? "Delete Job Listing" : "Expire Job Listing"}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to{" "}
                {confirmAction.type === "delete" ? "permanently delete" : "expire"}{" "}
                <strong>{confirmAction.title}</strong> by <strong>{confirmAction.company}</strong>?
                {confirmAction.type === "delete" && " This action cannot be undone."}
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold hover:bg-muted w-full"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const { type, jobId } = confirmAction;
                    setConfirmAction(null);
                    if (type === "delete") {
                      await executeDelete(jobId);
                    } else {
                      await executeExpire(jobId);
                    }
                  }}
                  className={`rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-soft w-full transition ${confirmAction.type === "delete"
                    ? "bg-destructive hover:opacity-90"
                    : "bg-amber-600 hover:bg-amber-700"
                    }`}
                >
                  Confirm {confirmAction.type === "delete" ? "Delete" : "Expire"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-float ${toast.type === "success"
              ? "bg-success text-success-foreground"
              : "bg-destructive text-destructive-foreground"
              }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
