import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
  Loader2,
  ExternalLink,
  X,
  Calendar,
  Phone,
  Mail,
  MessageCircle,
  Plus,
  FileText,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { type Job } from "@/lib/mock-data";
import { PostJobModal } from "@/components/PostJobModal";
import { getJobsEverywhere, isJobExpired } from "@/lib/api/jobs.functions";
import logo from "@/assets/Logo.png";

export const Route = createFileRoute("/results")({
  head: (): any => ({
    meta: [
      { title: "Examination Results — Jiwika" },
      {
        name: "description",
        content: "Check the latest government examination results across Assam.",
      },
    ],
  }),
  component: ResultsPage,
});

const ITEMS_PER_PAGE = 12;

function ResultsPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [redirectJob, setRedirectJob] = useState<Job | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedKeyword(keyword), 600);
    return () => clearTimeout(handler);
  }, [keyword]);

  useEffect(() => {
    if (redirectJob) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [redirectJob]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getJobsEverywhere({
        data: {
          keyword: debouncedKeyword || undefined,
          jobType: "results",
        },
      });
      setJobs(result.jobs);
    } catch (err) {
      console.error("Failed to fetch results:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedKeyword]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs, debouncedKeyword]);

  const sortedJobs = useMemo(() => {
    const list = [...jobs];
    list.sort((a, b) => {
      const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime();
      if (timeA !== 0 && timeB !== 0) return timeB - timeA;
      return 0;
    });
    return list;
  }, [jobs]);

  const totalPages = Math.ceil(sortedJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = sortedJobs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const getFormattedDate = (job: Job) => {
    const dateSource = job.publishedAt || job.createdAt;
    if (!dateSource) return job.posted;
    const date = new Date(dateSource);
    if (isNaN(date.getTime())) return job.posted;
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="relative min-h-screen">
      {/* ═══ NAVBAR ═══ */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-[#E8EDF3]"
        style={{ height: "80px" }}
      >
        <div className="mx-auto flex h-full max-w-[1450px] items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-xl border border-[#E7EAEE] bg-white px-3 py-2 text-[13px] font-semibold text-[#4B5563] hover:text-[#111827] hover:border-[#0F8B6D]/30 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 text-[#6B7280]" />
              <span>Back</span>
            </Link>
            <Link to="/">
              <img src={logo} alt="Jiwika" className="h-12 w-auto object-contain" />
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-[13px] font-medium text-[#6B7280]">
              <ChevronDown className="h-3.5 w-3.5 rotate-[-90deg]" /> Examination Results
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/jobs"
              className="hidden sm:flex items-center gap-2 rounded-2xl border border-[#E7EAEE] bg-white px-5 text-[13px] font-medium text-[#4B5563] hover:border-[#0F8B6D]/40"
              style={{ height: "48px", borderRadius: "16px" }}
            >
              Browse Jobs
            </Link>
            <button
              onClick={() => setPostOpen(true)}
              className="flex items-center gap-2 bg-[#0F8B6D] text-white text-[13px] font-semibold px-5 hover:bg-[#0B6B55]"
              style={{ height: "48px", borderRadius: "16px" }}
            >
              <Plus className="h-4 w-4" /> Post a Job
            </button>
          </div>
        </div>
      </motion.header>

      {/* ═══ CONTENT ═══ */}
      <main className="mx-auto max-w-[1450px] px-6 lg:px-10 py-8">
        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="max-w-[1200px] mx-auto"
        >
          <div
            className="flex items-center bg-white/60 backdrop-blur-xl border border-white/30 w-full max-w-[850px] md:w-3/5 mx-auto overflow-hidden h-14 sm:h-[72px] rounded-[24px] sm:rounded-[50px]"
            style={{
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.04)",
            }}
          >
            <div className="flex items-center gap-2 flex-1 px-3 sm:px-4 h-full">
              <Search className="h-5 w-5 sm:h-6 sm:w-6 ml-1.5 sm:ml-3 text-[#6B7280] shrink-0" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setDebouncedKeyword(keyword);
                    fetchJobs();
                  }
                }}
                placeholder="Search results (e.g. APSC, Junior Assistant, SSC)"
                className="flex-1 h-full pl-1 sm:pl-3 bg-transparent text-sm sm:text-base text-[#111827] placeholder:text-[#9CA3AF] outline-none font-medium"
              />
            </div>
            <button
              onClick={fetchJobs}
              className="h-10 sm:h-[52px] px-4 sm:px-6 mr-4 sm:mr-6 bg-[#8B5CF6] text-white text-xs sm:text-base font-semibold flex items-center gap-1.5 transition-all duration-200 hover:bg-[#7C3AED] shrink-0"
              style={{ borderRadius: "50px", transform: "translate(10px, 0px)" }}
            >
              <Search className="h-3.5 w-3.5" /> Search Results
            </button>
          </div>
        </motion.div>

        {/* Info bar */}
        <div className="flex items-center justify-between mt-8 mb-6">
          <div className="flex items-center gap-3">
            <span
              className="text-[13px] font-bold text-[#8B5CF6] px-4 py-2 rounded-full shadow-sm"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(139, 92, 246, 0.25)" }}
            >
              {sortedJobs.length} {sortedJobs.length === 1 ? "result" : "results"} found
            </span>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-[#8B5CF6]" />}
          </div>
        </div>

        {/* Results cards */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity duration-200 ${loading ? "opacity-60 pointer-events-none" : ""}`}
        >
          <AnimatePresence mode="popLayout">
            {paginatedJobs.map((job, i) => (
              <motion.div
                key={job.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                whileHover={{ y: -3 }}
                className="group bg-white border border-[#E8EDF3] p-6 flex flex-col justify-between transition-shadow"
                style={{ borderRadius: "24px", boxShadow: "0 8px 30px rgba(15,23,42,.06)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 18px 40px rgba(15,23,42,.10)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 8px 30px rgba(15,23,42,.06)";
                }}
              >
                <div>
                  {/* Status badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${isJobExpired(job) ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                        }`}
                    >
                      {isJobExpired(job) ? "📋 Results Out" : "🟢 Active"}
                    </span>
                  </div>

                  {/* Exam name */}
                  <div className="flex items-start gap-3">
                    <div
                      className="flex items-center justify-center h-10 w-10 rounded-xl text-[16px] shrink-0 mt-0.5"
                      style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}
                    >
                      🏛
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16px] font-bold text-[#111827] leading-tight">
                        {job.title}
                      </h3>
                      <p className="text-[13px] text-[#6B7280] mt-1">
                        {job.department || job.company}
                      </p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
                      <span>Published: {getFormattedDate(job)}</span>
                    </div>
                    {job.deadline && (
                      <div className="flex items-center gap-2 text-[12px] text-amber-600 font-semibold">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Last Date:{" "}
                          {isNaN(Date.parse(job.deadline))
                            ? job.deadline
                            : new Date(job.deadline).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom action */}
                <div className="mt-5 pt-4 border-t border-[#E8EDF3]">
                  <button
                    onClick={() => setRedirectJob(job)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] text-white py-3 text-[13px] font-semibold transition-all hover:bg-[#7C3AED]"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {isJobExpired(job) ? "Check Results" : "View Official Notice"}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {sortedJobs.length === 0 && !loading && (
            <div className="col-span-full rounded-3xl border border-dashed border-[#E7EAEE] bg-white/50 p-12 text-center">
              <p className="text-sm text-[#6B7280]">
                No government job results found. Try adjusting your search keyword.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="flex items-center gap-1 rounded-xl border border-[#E7EAEE] bg-white px-4 py-2.5 text-[13px] font-medium text-[#4B5563] hover:bg-[#F3F4F6] disabled:opacity-40"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span className="text-[13px] font-medium text-[#6B7280] px-4">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="flex items-center gap-1 rounded-xl border border-[#E7EAEE] bg-white px-4 py-2.5 text-[13px] font-medium text-[#4B5563] hover:bg-[#F3F4F6] disabled:opacity-40"
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </main>

      {/* ═══ MODALS ═══ */}
      <PostJobModal open={postOpen} onClose={() => setPostOpen(false)} />

      {/* Redirect Modal */}
      <AnimatePresence>
        {redirectJob && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setRedirectJob(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-float border border-[#E7EAEE] text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setRedirectJob(null)}
                className="absolute right-4 top-4 rounded-full p-1.5 text-[#6B7280] hover:bg-[#F3F4F6]"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] mb-4">
                <ExternalLink className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#111827]">
                {isJobExpired(redirectJob) ? "Checking Results" : "Viewing Official Notice"}
              </h3>
              <p className="mt-2.5 text-sm text-[#6B7280] leading-relaxed">
                You are about to visit the official Government portal.
                {isJobExpired(redirectJob)
                  ? " You can check the recruitment results, merit lists, or updates directly."
                  : " Applications for Government jobs are submitted only through the official portal."}
              </p>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setRedirectJob(null)}
                  className="rounded-xl border border-[#E7EAEE] bg-white px-4 py-2.5 text-xs font-semibold hover:bg-[#F3F4F6] flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const url = redirectJob.officialApplyLink || redirectJob.officialWebsite;
                    if (url) {
                      window.open(
                        url.startsWith("http") ? url : `https://${url}`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }
                    setRedirectJob(null);
                  }}
                  className="rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#7C3AED] flex-1"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contact FAB */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setContactOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex items-center gap-2 rounded-full bg-[#8B5CF6] px-5 py-3.5 text-sm font-semibold text-white shadow-float"
      >
        <Phone className="h-5 w-5" /> Contact
      </motion.button>

      <AnimatePresence>
        {contactOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setContactOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-float border border-[#E7EAEE]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setContactOpen(false)}
                className="absolute top-4 right-4 rounded-full p-1 hover:bg-[#F3F4F6]"
              >
                <X className="h-5 w-5 text-[#6B7280]" />
              </button>
              <div className="flex flex-col items-center gap-1 mb-5">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#8B5CF6]/10 mb-2">
                  <Phone className="h-6 w-6 text-[#8B5CF6]" />
                </div>
                <h2 className="text-lg font-bold text-[#111827]">Contact Us</h2>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  href="tel:+919342636875"
                  className="flex items-center gap-3 rounded-2xl border border-[#E7EAEE] px-4 py-3 hover:bg-[#F3F4F6]"
                >
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-green-500/10">
                    <Phone className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280]">Phone</p>
                    <p className="text-sm font-semibold text-[#111827]">+91 70026 22715</p>
                  </div>
                </a>
                <a
                  href="mailto:cbora9723@gmail.com"
                  className="flex items-center gap-3 rounded-2xl border border-[#E7EAEE] px-4 py-3 hover:bg-[#F3F4F6]"
                >
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-blue-500/10">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280]">Email</p>
                    <p className="text-sm font-semibold text-[#111827]">cbora9723@gmail.com</p>
                  </div>
                </a>
                <a
                  href="https://wa.me/917002622715"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-[#E7EAEE] px-4 py-3 hover:bg-[#F3F4F6]"
                >
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-emerald-500/10">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280]">WhatsApp</p>
                    <p className="text-sm font-semibold text-[#111827]">+91 7002622715</p>
                  </div>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
