import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Search,
  BadgeCheck,
  MessageCircle,
  Mail,
  Plus,
  Briefcase,
  ChevronDown,
  Loader2,
  LocateFixed,
  Globe,
  AlertCircle,
  ExternalLink,
  X,
  Calendar,
  Phone,
  ClipboardList,
  FileText,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { DISTRICTS, type Job } from "@/lib/mock-data";
import { ApplyModal } from "@/components/ApplyModal";
import { PostJobModal } from "@/components/PostJobModal";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getJobsNearby, getJobsEverywhere, isJobExpired } from "@/lib/api/jobs.functions";
import { useLongPressAdmin } from "@/hooks/use-long-press-admin";
import logo from "@/assets/Logo.png";

export const Route = createFileRoute("/")({
  head: (): any => ({
    meta: [
      { title: "Jiwika — Find the right job in your region" },
      {
        name: "description",
        content:
          "Search jobs across Assam by district and location. No registration. Apply instantly.",
      },
      {
        property: "og:title",
        content: "Jiwika — Find the right job in your region",
      },
      {
        property: "og:description",
        content:
          "Search local jobs by district and location. Apply on WhatsApp or Email in seconds.",
      },
    ],
  }),
  component: Index,
});

type SearchMode = "nearby" | "everywhere" | "results";

type JobWithDistance = Job & { distance?: number | null };

const getFormattedPostDate = (job: Job) => {
  const dateSource = job.publishedAt || job.createdAt;
  if (!dateSource) return job.posted;

  const date = new Date(dateSource);
  if (isNaN(date.getTime())) return job.posted;

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function Index() {
  const navigate = useNavigate();
  const [searchMode, setSearchMode] = useState<SearchMode>("nearby");
  const [district, setDistrict] = useState("");
  const [location, setLocation] = useState("");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [sort, setSort] = useState("recent");
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [redirectJob, setRedirectJob] = useState<Job | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // First-time session splash loading screen state
  // Always start false to avoid hydration mismatch (server vs client),
  // then check sessionStorage in a client-only effect.
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // On mount (client-only), decide whether to show splash
    try {
      if (sessionStorage.getItem("jiwika_splash_shown") !== "true") {
        setShowSplash(true);
      }
    } catch (e) {
      setShowSplash(true);
    }
  }, []);

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        try {
          sessionStorage.setItem("jiwika_splash_shown", "true");
        } catch (e) { }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Job Type Filter: all, private, government, results
  const [jobTypeFilter, setJobTypeFilter] = useState<"all" | "private" | "government" | "results">(
    "all",
  );

  // Jobs state
  const [jobs, setJobs] = useState<JobWithDistance[]>([]);
  const [loading, setLoading] = useState(false);

  // Geolocation
  const geo = useGeolocation(searchMode === "nearby");

  // Manual location overrides
  const [customLat, setCustomLat] = useState<number | null>(null);
  const [customLng, setCustomLng] = useState<number | null>(null);
  const [customLocationName, setCustomLocationName] = useState<string | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const activeLat = customLat ?? geo.lat;
  const activeLng = customLng ?? geo.lng;
  const activeLocationName = customLocationName ?? geo.locationName;
  const isCustom = customLat !== null;

  // Hook for hidden admin access trigger
  const { isPressing, progress, toastMessage, triggerHandlers } = useLongPressAdmin();

  // Debounce keyword search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 600);
    return () => clearTimeout(handler);
  }, [keyword]);

  // Track scroll for sticky header
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  // Lock body scroll when redirect modal is open
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

  // Fetch jobs based on mode
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      if (searchMode === "nearby") {
        const activeLat = customLat ?? geo.lat;
        const activeLng = customLng ?? geo.lng;
        if (activeLat !== null && activeLng !== null) {
          const result = await getJobsNearby({
            data: {
              lat: activeLat,
              lng: activeLng,
              keyword: debouncedKeyword || undefined,
              jobType:
                jobTypeFilter === "government" || jobTypeFilter === "results"
                  ? "all"
                  : jobTypeFilter,
            },
          });
          setJobs(result.jobs);
        }
      } else if (searchMode === "everywhere") {
        const result = await getJobsEverywhere({
          data: {
            district: district || undefined,
            location: location || undefined,
            keyword: debouncedKeyword || undefined,
            jobType: jobTypeFilter,
          },
        });
        setJobs(result.jobs);
      } else if (searchMode === "results") {
        const result = await getJobsEverywhere({
          data: {
            keyword: debouncedKeyword || undefined,
            jobType: "results",
          },
        });
        setJobs(result.jobs);
      }
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  }, [
    searchMode,
    geo.lat,
    geo.lng,
    customLat,
    customLng,
    debouncedKeyword,
    district,
    location,
    jobTypeFilter,
  ]);

  // Auto-fetch on relevant state changes
  useEffect(() => {
    const activeLat = customLat ?? geo.lat;
    if (searchMode === "nearby" && activeLat === null) return; // Wait for location
    fetchJobs();
  }, [
    fetchJobs,
    searchMode,
    geo.lat,
    customLat,
    jobTypeFilter,
    debouncedKeyword,
    district,
    location,
  ]);

  // Sort jobs client-side
  const sortedJobs = useMemo(() => {
    const list = [...jobs];
    if (sort === "salary") {
      const parseSalary = (s: string): number => {
        const nums = s.match(/[\d.]+/g)?.map(Number) ?? [];
        if (nums.length === 0) return 0;
        const val = nums[nums.length - 1];
        if (/lpa/i.test(s)) return val * 8.33;
        return val;
      };
      list.sort((a, b) => parseSalary(b.salary) - parseSalary(a.salary));
    } else {
      const parseRecency = (s: string): number => {
        const lower = s.toLowerCase().trim();
        if (lower === "just now") return 0;
        if (lower === "today") return 1;
        const num = parseFloat(lower) || 1;
        if (lower.includes("minute")) return num / 60;
        if (lower.includes("hour")) return num;
        if (lower.includes("day")) return num * 24;
        if (lower.includes("week")) return num * 24 * 7;
        if (lower.includes("month")) return num * 24 * 30;
        return 9999; // unknown → push to bottom
      };
      list.sort((a, b) => {
        const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime();
        if (timeA !== 0 && timeB !== 0) {
          return timeB - timeA;
        }
        return parseRecency(a.posted) - parseRecency(b.posted);
      });
    }
    return list;
  }, [jobs, sort]);

  // Live dashboard states (initially null to show loading skeletons)
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [everywhereCount, setEverywhereCount] = useState<number | null>(null);
  const [resultsCount, setResultsCount] = useState<number | null>(null);

  const [nearbyList, setNearbyList] = useState<[string, number][] | null>(null);
  const [everywhereList, setEverywhereList] = useState<[string, number][] | null>(null);
  const [resultsList, setResultsList] = useState<any[] | null>(null);

  // Parallel fetch dashboard data with sessionStorage cache
  useEffect(() => {
    let active = true;

    const loadDashboardData = async () => {
      const activeLat = customLat ?? geo.lat ?? 26.2006;
      const activeLng = customLng ?? geo.lng ?? 92.9376;

      try {
        // Fetch parallel
        const [nearRes, evRes, resRes] = await Promise.all([
          getJobsNearby({
            data: {
              lat: activeLat,
              lng: activeLng,
              jobType: "all",
            },
          }),
          getJobsEverywhere({
            data: {
              jobType: "all",
            },
          }),
          getJobsEverywhere({
            data: {
              jobType: "results",
            },
          }),
        ]);

        if (!active) return;

        if (nearRes?.jobs) {
          const counts: Record<string, number> = {};
          nearRes.jobs.forEach((j) => {
            const d = j.district && j.district.trim() ? j.district.trim() : "Statewide";
            counts[d] = (counts[d] || 0) + 1;
          });
          const list = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
          setNearbyCount(nearRes.jobs.length);
          setNearbyList(list);
        } else {
          setNearbyCount(0);
          setNearbyList([]);
        }

        if (evRes?.jobs) {
          const counts: Record<string, number> = {};
          evRes.jobs.forEach((j) => {
            const d = j.district && j.district.trim() ? j.district.trim() : "Statewide";
            counts[d] = (counts[d] || 0) + 1;
          });
          const list = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
          setEverywhereCount(evRes.jobs.length);
          setEverywhereList(list);
        } else {
          setEverywhereCount(0);
          setEverywhereList([]);
        }

        if (resRes?.jobs) {
          const list = resRes.jobs.slice(0, 3);
          setResultsCount(resRes.jobs.length);
          setResultsList(list);
        } else {
          setResultsCount(0);
          setResultsList([]);
        }
      } catch (err) {
        console.error("Dashboard parallel fetch failed:", err);
        setNearbyCount(0);
        setNearbyList([]);
        setEverywhereCount(0);
        setEverywhereList([]);
        setResultsCount(0);
        setResultsList([]);
      }
    };

    loadDashboardData();
    return () => {
      active = false;
    };
  }, [geo.lat, geo.lng, customLat, customLng]);

  // ─── NAV LINKS ───
  const navLinks = [
    { label: "Jobs", href: "/jobs" as const },
    { label: "Government Jobs", href: "/jobs" as const },
    { label: "Results", href: "/results" as const },
  ];
  // Entrance animation delay based on splash loading screen
  const baseDelay = showSplash ? 2.8 : 0;

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* ═══ FIRST-TIME ANIMATED SPLASH LOADING SCREEN ═══ */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#051C15] text-white overflow-hidden select-none will-change-transform transform-gpu"
          >
            {/* Ambient background glowing gradient blobs (GPU accelerated) */}
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-[#0F8B6D]/40 to-[#5ED6B3]/20 blur-[100px] pointer-events-none will-change-transform transform-gpu"
            />
            <motion.div
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute w-[450px] h-[450px] rounded-full bg-gradient-to-br from-[#0B4F3E]/40 to-[#0F8B6D]/30 blur-[90px] pointer-events-none will-change-transform transform-gpu"
            />

            {/* Rising particle starfield */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    x: (i * 83 + 12) % 100 + "%",
                    y: "110%",
                    opacity: 0,
                    scale: 0.4 + (i % 3) * 0.2,
                  }}
                  animate={{
                    y: "-10%",
                    opacity: [0, 0.7, 0],
                  }}
                  transition={{
                    duration: 3.5 + (i % 3),
                    repeat: Infinity,
                    delay: (i * 0.3) % 2,
                    ease: "linear",
                  }}
                  className="absolute w-2 h-2 rounded-full bg-[#5ED6B3] blur-[1px] will-change-transform transform-gpu"
                />
              ))}
            </div>

            {/* Main Content Card */}
            <div className="relative flex flex-col items-center z-10 px-6 max-w-md w-full">
              {/* Logo with Dual Spinning Orbit Rings */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative mb-7"
              >
                {/* Outer Dashed Orbit Ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-12 rounded-full border-2 border-dashed border-[#5ED6B3]/40 pointer-events-none will-change-transform transform-gpu"
                />

                {/* Inner Gradient Orbit Ring */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-7 rounded-full border-2 border-transparent border-t-[#5ED6B3] border-r-[#0F8B6D]/60 pointer-events-none will-change-transform transform-gpu"
                />

                {/* Outer Ambient Glow */}
                <div className="absolute -inset-10 rounded-full bg-[#5ED6B3]/35 blur-3xl animate-pulse pointer-events-none" />

                {/* White Logo Shell */}
                <div className="relative w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-white/90 backdrop-blur-2xl p-2 sm:p-2 border-4 border-white/50 shadow-[0_25px_60px_rgba(0,0,0,0.55)] flex items-center justify-center">
                  <img
                    src={logo}
                    alt="Jiwika Logo"
                    className="w-full h-full object-contain drop-shadow-[0_4px_16px_rgba(15,139,109,0.4)]"
                  />
                </div>
              </motion.div>

              {/* Tagline Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="mt-10 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-xs sm:text-sm font-bold text-emerald-100/90 tracking-wide flex items-center gap-2 shadow-lg"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#5ED6B3] animate-pulse" />
                Connecting Talent Across Assam
              </motion.div>

              {/* Ultra-Smooth Framer Motion Progress Bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="mt-8 w-full flex flex-col items-center"
              >
                {/* Progress Bar Container */}
                <div className="w-full max-w-[240px] h-2 bg-white/10 backdrop-blur-md rounded-full overflow-hidden p-0.5 border border-white/15 relative shadow-inner">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.9, ease: [0.25, 1, 0.5, 1] }}
                    className="h-full bg-gradient-to-r from-[#0F8B6D] via-[#5ED6B3] to-teal-100 rounded-full shadow-[0_0_16px_#5ED6B3]"
                  />
                </div>

                {/* Status Badge */}
                <div className="mt-3.5 flex items-center gap-2 text-xs font-semibold text-emerald-200/90 tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5ED6B3] animate-ping" />
                  Loading Opportunities...
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ═══ NAVBAR ═══ */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: baseDelay }}
        className="relative z-30 w-full shrink-0"
        style={{ height: "80px" }}
      >
        <div className="mx-auto flex h-full max-w-[1450px] items-center justify-between px-4 sm:px-6 lg:px-10">
          {/* Left — Logo */}
          <div
            className="flex items-center gap-2 select-none touch-none relative"
            {...triggerHandlers}
          >
            <img src={logo} alt="Jiwika" className="h-12 sm:h-14 w-auto object-contain" />
          </div>

          {/* Right — Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={() => setShowLocationSelector(!showLocationSelector)}
              className="flex items-center justify-center gap-1.5 bg-[#0F8B6D] text-white text-[12px] sm:text-[13px] font-semibold px-2.5 sm:px-4 transition-all duration-200 hover:bg-[#0B6B55] hover:scale-[1.02]"
              style={{ height: "40px", borderRadius: "30px" }}
            >
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Jobs in Assam </span>
            </button>
            <button
              onClick={() => setPostOpen(true)}
              className="flex items-center justify-center gap-1.5 bg-[#0F8B6D] text-white text-[12px] sm:text-[13px] font-semibold px-2.5 sm:px-4 transition-all duration-200 hover:bg-[#0B6B55] hover:scale-[1.02]"
              style={{ height: "40px", borderRadius: "30px" }}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Post a Job</span>
              <span className="sm:hidden">Post</span>
            </button>
            <button
              onClick={() => setContactOpen(true)}
              className="flex items-center justify-center gap-1.5 bg-[#0F8B6D] text-white text-[12px] sm:text-[13px] font-semibold px-2.5 sm:px-4 transition-all duration-200 hover:bg-[#0B6B55] hover:scale-[1.02]"
              style={{ height: "40px", borderRadius: "30px" }}
            >
              <Phone className="h-4 w-4 shrink-0 text-[#00000]" />
              <span className="hidden sm:inline">Contact Us</span>
            </button>
          </div>
        </div>
      </motion.header>

      {/* ═══ LOCATION SELECTOR DROPDOWN ═══ */}
      <AnimatePresence>
        {showLocationSelector && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[80px] right-6 lg:right-10 z-40 w-80 rounded-2xl border border-[#E7EAEE] bg-white p-5 shadow-card-hover"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-[#111827]">Set Your Location</p>
              <button
                onClick={() => setShowLocationSelector(false)}
                className="text-[#6B7280] hover:text-[#111827] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {activeLocationName && (
              <div className="flex items-center gap-2 rounded-xl bg-[#0F8B6D]/5 px-3 py-2 mb-3 text-[12px] font-medium text-[#0F8B6D]">
                <MapPin className="h-3.5 w-3.5" />
                {activeLocationName}
                {isCustom && (
                  <span className="ml-auto text-[10px] bg-[#0F8B6D]/10 px-2 py-0.5 rounded-full">
                    Custom
                  </span>
                )}
              </div>
            )}

            <Select
              value={selectedDistrict}
              onChange={(v) => setSelectedDistrict(v)}
              placeholder="Select District"
              options={Object.keys(DISTRICTS)}
            />

            <div className="flex justify-end gap-2 mt-3">
              {isCustom && (
                <button
                  onClick={() => {
                    setCustomLat(null);
                    setCustomLng(null);
                    setCustomLocationName(null);
                    setSelectedDistrict("");
                    setShowLocationSelector(false);
                  }}
                  className="rounded-xl px-3 py-2 text-[12px] font-medium border border-[#E7EAEE] hover:bg-[#F3F4F6] text-[#111827] transition-colors"
                >
                  Reset
                </button>
              )}
              <button
                disabled={!selectedDistrict}
                onClick={() => {
                  const districtCoordsMap: Record<string, { lat: number; lng: number }> = {
                    Bajali: { lat: 26.3313, lng: 91.1738 },
                    Baksa: { lat: 26.4764, lng: 91.4116 },
                    Barpeta: { lat: 26.32, lng: 91.0 },
                    Biswanath: { lat: 26.7327, lng: 93.1557 },
                    Bongaigaon: { lat: 26.4764, lng: 90.5581 },
                    Cachar: { lat: 24.8333, lng: 92.7789 },
                    Charaideo: { lat: 27.0189, lng: 95.0306 },
                    Chirang: { lat: 26.5298, lng: 90.5284 },
                    Darrang: { lat: 26.4326, lng: 92.036 },
                    Dhemaji: { lat: 27.4815, lng: 94.5772 },
                    Dhubri: { lat: 26.021, lng: 89.9708 },
                    Dibrugarh: { lat: 27.4728, lng: 94.912 },
                    "Dima Hasao": { lat: 25.1833, lng: 93.0333 },
                    Goalpara: { lat: 26.1732, lng: 90.6277 },
                    Golaghat: { lat: 26.5222, lng: 93.9611 },
                    Hailakandi: { lat: 24.6833, lng: 92.5667 },
                    Hojai: { lat: 26.0022, lng: 92.8617 },
                    Jorhat: { lat: 26.7578, lng: 94.2098 },
                    Kamrup: { lat: 26.2309, lng: 91.6841 },
                    "Kamrup Metropolitan": { lat: 26.1445, lng: 91.7362 },
                    "Karbi Anglong": { lat: 25.849, lng: 93.4333 },
                    Karimganj: { lat: 24.8667, lng: 92.3667 },
                    Kokrajhar: { lat: 26.4, lng: 90.2667 },
                    Lakhimpur: { lat: 27.23, lng: 94.1 },
                    Majuli: { lat: 26.9632, lng: 94.195 },
                    Morigaon: { lat: 26.25, lng: 92.2667 },
                    Nagaon: { lat: 26.35, lng: 92.6833 },
                    Nalbari: { lat: 26.4444, lng: 91.4444 },
                    Sivasagar: { lat: 26.9838, lng: 94.6375 },
                    Sonitpur: { lat: 26.6338, lng: 92.7926 },
                    "South Salmara-Mankachar": { lat: 25.6833, lng: 89.8833 },
                    Tamulpur: { lat: 26.6358, lng: 91.5794 },
                    Tinsukia: { lat: 27.5, lng: 95.36 },
                    Udalguri: { lat: 26.7465, lng: 92.0962 },
                    "West Karbi Anglong": { lat: 25.8333, lng: 92.5833 },
                  };
                  const districtCoords = districtCoordsMap[selectedDistrict] || {
                    lat: 26.2006,
                    lng: 92.9376,
                  };

                  setCustomLat(districtCoords.lat);
                  setCustomLng(districtCoords.lng);
                  setCustomLocationName(selectedDistrict);
                  setShowLocationSelector(false);
                }}
                className="rounded-xl bg-[#0F8B6D] px-4 py-2 text-[12px] font-semibold text-white transition-all hover:bg-[#0B6B55] disabled:opacity-50"
              >
                Set Location
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 flex flex-col items-center  min-h-0  px-4  py-4">
        {/* ─── SEARCH SECTION ─── */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: baseDelay + 0.08 }}
          className="w-full max-w-[850px] md:w-3/5 -mt-5 mb-6 shrink-0 sm:px-0 flex flex-col gap-2.5"
        >
          {/* Location indicator chip on top of Search Bar */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowLocationSelector((prev) => !prev)}
            className="flex items-center gap-1.5 self-center bg-white/50 backdrop-blur-md hover:bg-white/80 text-[#0F8B6D] py-1.5 px-4 rounded-full border border-white/40 cursor-pointer shadow-sm transition-all duration-200 select-none"
          >
            <MapPin className="h-3.5 w-3.5 animate-pulse" />
            <span className="text-[12px] font-bold">Location:</span>
            <span className="text-[12px] text-[#374151] font-semibold">
              {activeLocationName || (geo.loading ? "Detecting location..." : "Loading.....")}
            </span>
            <ChevronDown className="h-3 w-3 text-[#6B7280] ml-0.5" />
          </motion.div>

          <div
            className="flex items-center bg-white/60 backdrop-blur-xl border border-white/30 w-full overflow-hidden h-14 sm:h-[72px] rounded-[24px] sm:rounded-[50px]"
            style={{
              boxShadow: "0 8px 32px 0 rgba(94, 102, 214, 0.04)",
            }}
          >
            <div className="flex items-center gap-2 flex-1 px-3 sm:px-4 h-full">
              <Search className="h-5 w-5 sm:h-6 sm:w-6 ml-1.5 sm:ml-3 text-[#6B7280] shrink-0" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    navigate({
                      to: "/jobs",
                      search: { keyword: keyword || undefined } as any,
                    });
                  }
                }}
                placeholder="Search jobs across Assam..."
                className="flex-1 h-full pl-1 sm:pl-3 bg-transparent text-sm sm:text-base text-[#111827] placeholder:text-[#9CA3AF] outline-none font-medium"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                navigate({
                  to: "/jobs",
                  search: { keyword: keyword || undefined } as any,
                });
              }}
              className="h-10 sm:h-[52px] px-4 sm:px-6 mr-4 sm:mr-6 bg-[#0F8B6D] text-white text-xs sm:text-base font-semibold flex items-center gap-1.5 transition-all duration-200 hover:bg-[#0B6B55] shrink-0"
              style={{ borderRadius: "50px", transform: "translate(10px, 0px)" }}
            >
              <Search className="h-3.5 w-3.5" />
              Search
            </motion.button>
          </div>
        </motion.div>

        {/* ─── 3 PREVIEW PANELS ─── */}
        <div className="w-full max-w-[1050px] grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* ══ PANEL 1 — NEARBY (Green) ══ */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: baseDelay + 0.16 }}
            className="flex flex-col bg-white/60 backdrop-blur-xl p-5 sm:p-8 sm:pb-5 w-full max-w-[340px] sm:max-w-none mx-auto sm:mx-0"
            style={{
              borderRadius: "28px",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.04)",
            }}
          >
            <div>
              {/* Centered header */}
              <div className="flex flex-col p-2 items-center text-center">
                {/* 72px circular icon */}
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full"
                  style={{ backgroundColor: "#E8F5EE" }}
                >
                  <MapPin className="text-[#0F8B6D] w-10 h-10 sm:w-12 sm:h-12" />
                </div>
                {/* Title */}
                <h3
                  className="mt-3 text-[19px] sm:text-[22px] font-bold text-[#0F8B6D]"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  Nearby
                </h3>
                {/* Subtitle */}
                <p className="mt-0.5 text-[13px] text-[#6B7280]">Jobs near your location</p>
              </div>
            </div>

            {/* Statistics box & list loader */}
            {nearbyCount === null || nearbyList === null ? (
              <div className="flex-1 flex flex-col justify-between mt-4">
                <div className="w-full h-16 rounded-2xl bg-[#EAF8F0]/80 animate-pulse flex flex-col items-center justify-center gap-1">
                  <div className="h-6 w-16 bg-[#0F8B6D]/15 rounded-full" />
                  <div className="h-3 w-20 bg-[#0F8B6D]/10 rounded-full" />
                </div>
                <div className="mt-4 flex-1 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between h-9 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#0F8B6D]/10 animate-pulse" />
                        <div className="h-4 w-24 bg-gray-200 animate-pulse rounded-md" />
                      </div>
                      <div className="h-3.5 w-12 bg-gray-200 animate-pulse rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div
                  className="mt-4 flex flex-col items-center justify-center"
                  style={{
                    height: "64px",
                    borderRadius: "16px",
                    backgroundColor: "#EAF8F0",
                  }}
                >
                  <p className="text-[30px] font-extrabold text-[#0F8B6D] leading-none">
                    {nearbyCount}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium text-[#6B7280]">Jobs Found</p>
                </div>

                {/* District list — 4 rows */}
                <div className="mt-4 flex-1">
                  {nearbyList.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-[#6B7280] py-6">
                      No jobs nearby
                    </div>
                  ) : (
                    nearbyList.map(([districtName, count], i) => (
                      <div key={districtName}>
                        <div
                          className="flex items-center justify-between"
                          style={{ height: "36px", padding: "0 4px" }}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin
                              className="text-[#0F8B6D] shrink-0"
                              style={{ width: "15px", height: "15px" }}
                            />
                            <span className="text-[13px] font-medium text-[#374151]">
                              {districtName}
                            </span>
                          </div>
                          <span className="text-[12px] font-medium text-[#6B7280]">
                            {count} Jobs
                          </span>
                        </div>
                        {i < nearbyList.length - 1 && (
                          <div style={{ height: "1px", backgroundColor: "#F0F1F3" }} />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Bottom button */}
            <button
              onClick={() => navigate({ to: "/nearby" })}
              className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-[#0F8B6D] text-[#0F8B6D] font-semibold text-[13px] rounded-full hover:bg-[#0F8B6D] hover:text-white transition-all duration-200"
              style={{ height: "48px" }}
            >
              View Nearby Jobs →
            </button>
          </motion.div>

          {/* ══ PANEL 2 — EVERYWHERE (Gold) ══ */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: baseDelay + 0.24 }}
            className="flex flex-col bg-white/60 backdrop-blur-xl p-5 sm:p-8 sm:pb-5 w-full max-w-[340px] sm:max-w-none mx-auto sm:mx-0"
            style={{
              borderRadius: "28px",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.04)",
            }}
          >
            {/* Centered header */}
            <div className="flex flex-col items-center text-center">
              {/* 72px circular icon — Assam map style */}
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full"
                style={{ backgroundColor: "#FFF3D0" }}
              >
                <Globe className="text-[#D4A017] w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              {/* Title */}
              <h3
                className="mt-3 text-[19px] sm:text-[22px] font-bold text-[#B8860B]"
                style={{ letterSpacing: "-0.01em" }}
              >
                Everywhere
              </h3>
              {/* Subtitle */}
              <p className="mt-0.5 text-[13px] text-[#6B7280]">Jobs across Assam</p>
            </div>

            {/* Statistics box & list loader */}
            {everywhereCount === null || everywhereList === null ? (
              <div className="flex-1 flex flex-col justify-between mt-4">
                <div className="w-full h-16 rounded-2xl bg-[#FFF7DA]/80 animate-pulse flex flex-col items-center justify-center gap-1">
                  <div className="h-6 w-20 bg-[#D4A017]/15 rounded-full" />
                  <div className="h-3 w-24 bg-[#D4A017]/10 rounded-full" />
                </div>
                <div className="mt-4 flex-1 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between h-9 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#D4A017]/10 animate-pulse" />
                        <div className="h-4 w-28 bg-gray-200 animate-pulse rounded-md" />
                      </div>
                      <div className="h-3.5 w-12 bg-gray-200 animate-pulse rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div
                  className="mt-4 flex flex-col items-center justify-center"
                  style={{
                    height: "64px",
                    borderRadius: "16px",
                    backgroundColor: "#FFF7DA",
                  }}
                >
                  <p className="text-[30px] font-extrabold text-[#B8860B] leading-none">
                    {everywhereCount.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium text-[#6B7280]">Jobs Available</p>
                </div>

                {/* District list — 4 rows */}
                <div className="mt-4 flex-1">
                  {everywhereList.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-[#6B7280] py-6">
                      No jobs available
                    </div>
                  ) : (
                    everywhereList.map(([districtName, count], i) => (
                      <div key={districtName}>
                        <div
                          className="flex items-center justify-between"
                          style={{ height: "36px", padding: "0 4px" }}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin
                              className="text-[#D4A017] shrink-0"
                              style={{ width: "15px", height: "15px" }}
                            />
                            <span className="text-[13px] font-medium text-[#374151]">
                              {districtName}
                            </span>
                          </div>
                          <span className="text-[12px] font-medium text-[#6B7280]">
                            {count} Jobs
                          </span>
                        </div>
                        {i < everywhereList.length - 1 && (
                          <div style={{ height: "1px", backgroundColor: "#F0F1F3" }} />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Bottom button */}
            <button
              onClick={() => navigate({ to: "/jobs" })}
              className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-[#D4A017] text-[#B8860B] font-semibold text-[13px] rounded-full hover:bg-[#D4A017] hover:text-white transition-all duration-200"
              style={{ height: "48px" }}
            >
              Explore Jobs Across Assam →
            </button>
          </motion.div>

          {/* ══ PANEL 3 — RESULTS (Purple) ══ */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: baseDelay + 0.32 }}
            className="flex flex-col bg-white/60 backdrop-blur-xl p-5 sm:p-8 sm:pb-5 w-full max-w-[340px] sm:max-w-none mx-auto sm:mx-0"
            style={{
              borderRadius: "28px",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.04)",
            }}
          >
            {/* Centered header */}
            <div className="flex flex-col items-center text-center">
              {/* 72px circular icon */}
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full"
                style={{ backgroundColor: "#EDE9FE" }}
              >
                <ClipboardList className="text-[#7C3AED] w-6 h-6 sm:w-12 sm:h-12" />
              </div>
              {/* Title */}
              <h3
                className="mt-3 text-[19px] sm:text-[22px] font-bold text-[#7C3AED]"
                style={{ letterSpacing: "-0.01em" }}
              >
                Results
              </h3>
              {/* Subtitle */}
              <p className="mt-0.5 text-[13px] text-[#6B7280]">Check your exam results</p>
            </div>

            {/* Statistics box & list loader */}
            {resultsCount === null || resultsList === null ? (
              <div className="flex-1 flex flex-col justify-between mt-4">
                <div className="w-full h-16 rounded-2xl bg-[#F2EDFF]/80 animate-pulse flex flex-col items-center justify-center gap-1">
                  <div className="h-6 w-12 bg-[#7C3AED]/15 rounded-full" />
                  <div className="h-3 w-20 bg-[#7C3AED]/10 rounded-full" />
                </div>
                <div className="mt-4 flex-1 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between h-9 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#7C3AED]/10 animate-pulse" />
                        <div className="h-4 w-32 bg-gray-200 animate-pulse rounded-md" />
                      </div>
                      <ChevronRight
                        className="text-[#9CA3AF] shrink-0 opacity-40"
                        style={{ width: "16px", height: "16px" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div
                  className="mt-4 flex flex-col items-center justify-center"
                  style={{
                    height: "64px",
                    borderRadius: "16px",
                    backgroundColor: "#F2EDFF",
                  }}
                >
                  <p className="text-[30px] font-extrabold text-[#7C3AED] leading-none">
                    {resultsCount}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium text-[#6B7280]">Active Results</p>
                </div>

                {/* Results list — up to 3 rows */}
                <div className="mt-4 flex-1">
                  {resultsList.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-[#6B7280] py-6">
                      No active results
                    </div>
                  ) : (
                    resultsList.map((job, i) => (
                      <div key={job.id}>
                        <div
                          className="flex items-center justify-between"
                          style={{ height: "36px", padding: "0 4px" }}
                        >
                          <div className="flex items-center gap-2">
                            <FileText
                              className="text-[#7C3AED] shrink-0"
                              style={{ width: "15px", height: "15px" }}
                            />
                            <span className="text-[13px] font-medium text-[#374151] truncate max-w-[180px]">
                              {job.title}
                            </span>
                          </div>
                          <ChevronRight
                            className="text-[#9CA3AF] shrink-0"
                            style={{ width: "16px", height: "16px" }}
                          />
                        </div>
                        {i < resultsList.length - 1 && (
                          <div style={{ height: "1px", backgroundColor: "#F0F1F3" }} />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Bottom button */}
            <button
              onClick={() => navigate({ to: "/results" })}
              className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-[#7C3AED] text-[#7C3AED] font-semibold text-[13px] rounded-full hover:bg-[#7C3AED] hover:text-white transition-all duration-200"
              style={{ height: "48px" }}
            >
              View All Results →
            </button>
          </motion.div>
        </div>
      </main>

      {/* ═══ MODALS & FABs ═══ */}

      {/* Contact Us Modal */}
      <AnimatePresence>
        {contactOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
            onClick={() => setContactOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-float border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setContactOpen(false)}
                className="absolute top-4 right-4 rounded-full p-1 hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>

              <div className="flex flex-col items-center gap-1 mb-5">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-2">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Contact Us</h2>
                <p className="text-sm text-muted-foreground text-center">
                  We'd love to hear from you! Reach out through any of the channels below.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {/* Phone */}
                <a
                  href={`tel:${import.meta.env.VITE_CONTACT}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-green-500/10">
                    <Phone className="h-4.5 w-4.5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-semibold text-foreground">
                      {import.meta.env.VITE_CONTACT
                        ? `+91 ${import.meta.env.VITE_CONTACT.slice(0, 5)} ${import.meta.env.VITE_CONTACT.slice(5)}`
                        : ""}
                    </p>
                  </div>
                </a>

                {/* Email */}
                <a
                  href={`mailto:${import.meta.env.VITE_EMAIL}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-blue-500/10">
                    <Mail className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-semibold text-foreground">
                      {import.meta.env.VITE_EMAIL}
                    </p>
                  </div>
                </a>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/91${import.meta.env.VITE_CONTACT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-emerald-500/10">
                    <MessageCircle className="h-4.5 w-4.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                    <p className="text-sm font-semibold text-foreground">
                      {import.meta.env.VITE_CONTACT
                        ? `+91 ${import.meta.env.VITE_CONTACT.slice(0, 5)} ${import.meta.env.VITE_CONTACT.slice(5)}`
                        : ""}
                    </p>
                  </div>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ApplyModal job={applyJob} onClose={() => setApplyJob(null)} />
      <PostJobModal open={postOpen} onClose={() => setPostOpen(false)} />

      {/* Leaving Jiwika Redirection Modal */}
      <AnimatePresence>
        {redirectJob && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
            onClick={() => setRedirectJob(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-float border border-border text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setRedirectJob(null)}
                className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600 mb-4">
                <ExternalLink className="h-6 w-6" />
              </div>

              <h3 className="text-lg font-bold text-foreground">
                {isJobExpired(redirectJob) ? "Checking Results" : "Leaving Jiwika"}
              </h3>
              <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                {isJobExpired(redirectJob) ? (
                  <>
                    You are about to visit the official Government portal.
                    <br />
                    You can check the recruitment results, merit lists, or updates directly on their
                    website.
                  </>
                ) : (
                  <>
                    You are about to visit the official Government recruitment website.
                    <br />
                    Applications for Government jobs are submitted only through the official portal.
                  </>
                )}
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setRedirectJob(null)}
                  className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold hover:bg-muted w-full sm:flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const url = redirectJob.officialApplyLink || redirectJob.officialWebsite;
                    if (url) {
                      const targetUrl = url.startsWith("http") ? url : `https://${url}`;
                      window.open(targetUrl, "_blank", "noopener,noreferrer");
                    }
                    setRedirectJob(null);
                  }}
                  className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 w-full sm:flex-1"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Admin Access Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-float bg-success text-success-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{children}</span>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="input appearance-none pr-9 text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
