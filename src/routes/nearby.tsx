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
  ChevronDown,
  Loader2,
  LocateFixed,
  AlertCircle,
  ExternalLink,
  X,
  Calendar,
  Phone,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { DISTRICTS, type Job } from "@/lib/mock-data";
import { ApplyModal } from "@/components/ApplyModal";
import { PostJobModal } from "@/components/PostJobModal";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getJobsNearby, isJobExpired } from "@/lib/api/jobs.functions";
import { calculateDistance, isValidCoordinate } from "@/lib/utils";
import logo from "@/assets/Logo.png";

export const Route = createFileRoute("/nearby")({
  head: (): any => ({
    meta: [
      { title: "Nearby Jobs — Jiwika" },
      {
        name: "description",
        content: "Find jobs near your location in Assam. Apply instantly.",
      },
    ],
  }),
  component: NearbyPage,
});

type JobWithDistance = Job & { distance?: number | null };

const ITEMS_PER_PAGE = 12;

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

function NearbyPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [redirectJob, setRedirectJob] = useState<Job | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [jobTypeFilter, setJobTypeFilter] = useState<"all" | "private">("all");

  const [jobs, setJobs] = useState<JobWithDistance[]>([]);
  const [loading, setLoading] = useState(false);

  const geo = useGeolocation(true);

  const [customLat, setCustomLat] = useState<number | null>(null);
  const [customLng, setCustomLng] = useState<number | null>(null);
  const [customLocationName, setCustomLocationName] = useState<string | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const activeLat = customLat ?? geo.lat;
  const activeLng = customLng ?? geo.lng;
  const activeLocationName = customLocationName ?? geo.locationName;
  const isCustom = customLat !== null;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 600);
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
    const lat = customLat ?? geo.lat ?? 26.2006;
    const lng = customLng ?? geo.lng ?? 92.9376;

    setLoading(true);
    try {
      const result = await getJobsNearby({
        data: {
          lat,
          lng,
          keyword: debouncedKeyword || undefined,
          jobType: jobTypeFilter,
        },
      });
      setJobs(result.jobs);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  }, [geo.lat, geo.lng, customLat, customLng, debouncedKeyword, jobTypeFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const sortedJobs = useMemo(() => {
    const lat = customLat ?? geo.lat;
    const lng = customLng ?? geo.lng;

    let list = jobs.map((job) => {
      let jLat = job.latitude ?? job.lat;
      let jLng = job.longitude ?? job.lng;

      // Fallback to district center coordinates if missing or invalid (0,0)
      if (!isValidCoordinate(jLat, jLng) && job.district && districtCoordsMap[job.district]) {
        jLat = districtCoordsMap[job.district].lat;
        jLng = districtCoordsMap[job.district].lng;
      }

      const dist =
        job.distance !== undefined && job.distance !== null
          ? job.distance
          : calculateDistance(lat, lng, jLat, jLng);

      console.log(
        `[NEARBY PAGE LOG] User Coordinates: (${lat}, ${lng}) | Job (${job.title}): (${jLat}, ${jLng}) | Calculated Distance: ${dist !== null ? `${dist} km` : "Distance unavailable"}`,
      );

      return {
        ...job,
        distance: dist,
      };
    });

    list.sort((a, b) => {
      if (a.distance === null || a.distance === undefined) return 1;
      if (b.distance === null || b.distance === undefined) return -1;
      return a.distance - b.distance;
    });
    return list;
  }, [jobs, customLat, geo.lat, customLng, geo.lng]);

  const totalPages = Math.ceil(sortedJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = sortedJobs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

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
              className="flex items-center gap-1.5 rounded-xl border border-[#E7EAEE] bg-white px-2.5 sm:px-3 text-[13px] font-semibold text-[#4B5563] hover:text-[#111827] hover:border-[#0F8B6D]/30 transition-all duration-200"
              style={{ height: "40px" }}
            >
              <ArrowLeft className="h-4 w-4 text-[#6B7280]" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <Link to="/">
              <img src={logo} alt="Jiwika" className="h-10 sm:h-12 w-auto object-contain" />
            </Link>
            <div className="hidden md:flex items-center gap-2 text-[13px] font-medium text-[#6B7280]">
              <ChevronDown className="h-3.5 w-3.5 rotate-[-90deg]" />
              Nearby Jobs
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={() => setShowLocationSelector(!showLocationSelector)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E7EAEE] bg-white px-2.5 sm:px-4 text-[13px] font-medium text-[#4B5563] transition-all duration-200 hover:border-[#0F8B6D]/40"
              style={{ height: "40px" }}
            >
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">{activeLocationName || "Location"}</span>
            </button>
            <button
              onClick={() => setPostOpen(true)}
              className="flex items-center justify-center gap-1.5 bg-[#0F8B6D] text-white text-[12px] sm:text-[13px] font-semibold px-2.5 sm:px-5 transition-all duration-200 hover:bg-[#0B6B55]"
              style={{ height: "40px", borderRadius: "12px" }}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Post a Job</span>
              <span className="sm:hidden">Post</span>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Location selector */}
      <AnimatePresence>
        {showLocationSelector && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-[90px] right-6 lg:right-10 z-40 w-80 rounded-2xl border border-[#E7EAEE] bg-white p-5 shadow-card-hover"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-[#111827]">Set Your Location</p>
              <button
                onClick={() => setShowLocationSelector(false)}
                className="text-[#6B7280] hover:text-[#111827]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {geo.error && !isCustom && (
              <div className="flex items-center gap-2 text-[12px] text-red-500 mb-2">
                <AlertCircle className="h-3.5 w-3.5" /> {geo.error}
                <button onClick={geo.retry} className="underline ml-1">
                  Retry
                </button>
              </div>
            )}
            <NearbySelect
              value={selectedDistrict}
              onChange={setSelectedDistrict}
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
                  className="rounded-xl px-3 py-2 text-[12px] font-medium border border-[#E7EAEE] hover:bg-[#F3F4F6] text-[#111827]"
                >
                  Reset
                </button>
              )}
              <button
                disabled={!selectedDistrict}
                onClick={() => {
                  const coords = districtCoordsMap[selectedDistrict] || {
                    lat: 26.2006,
                    lng: 92.9376,
                  };
                  setCustomLat(coords.lat);
                  setCustomLng(coords.lng);
                  setCustomLocationName(selectedDistrict);
                  setShowLocationSelector(false);
                }}
                className="rounded-xl bg-[#0F8B6D] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0B6B55] disabled:opacity-50"
              >
                Set Location
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CONTENT ═══ */}
      <main className="mx-auto max-w-[1450px] px-6 lg:px-10 py-8">
        {/* Search bar */}
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
                placeholder="Search by title, company, salary..."
                className="flex-1 h-full pl-1 sm:pl-3 bg-transparent text-sm sm:text-base text-[#111827] placeholder:text-[#9CA3AF] outline-none font-medium"
              />
            </div>
            <button
              onClick={fetchJobs}
              disabled={activeLat === null}
              className="h-10 sm:h-[52px] px-4 sm:px-6 mr-4 sm:mr-6 bg-[#0F8B6D] text-white text-xs sm:text-base font-semibold flex items-center gap-1.5 transition-all duration-200 hover:bg-[#0B6B55] shrink-0 disabled:opacity-50"
              style={{ borderRadius: "50px", transform: "translate(10px, 0px)" }}
            >
              <Search className="h-3.5 w-3.5" /> Search
            </button>
          </div>
        </motion.div>

        {/* Geo status */}
        {geo.loading && (
          <div className="flex items-center justify-center gap-2 mt-4 text-[13px] text-[#0F8B6D] font-medium">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Detecting your location...
          </div>
        )}

        {/* Filters bar */}
        <div className="flex items-center justify-between mt-8 mb-6">
          <div className="flex items-center gap-3">
            <span
              className="text-[13px] font-bold text-[#0F8B6D] px-4 py-2 rounded-full shadow-sm"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(15, 139, 109, 0.25)" }}
            >
              {sortedJobs.length} {sortedJobs.length === 1 ? "job" : "jobs"} found
            </span>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-[#0F8B6D]" />}
            <div className="flex items-center bg-[#F3F4F6] p-1 rounded-full border border-[#E5E7EB] ml-4">
              {(["all", "private"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setJobTypeFilter(type);
                    setPage(1);
                  }}
                  className={`rounded-full px-4 py-1.5 text-[12px] font-bold transition-all duration-200 ${jobTypeFilter === type
                    ? "bg-[#0F8B6D] text-white shadow-sm"
                    : "text-[#4B5563] hover:text-[#111827]"
                    }`}
                >
                  {type === "all" ? "All Jobs" : "🏢 Private"}
                </button>))}
            </div>
          </div>
        </div>

        {/* Job cards */}
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
                className="group bg-white/60 backdrop-blur-xl border border-white/30 p-5 flex flex-col justify-between transition-shadow w-full max-w-[340px] sm:max-w-none mx-auto sm:mx-0"
                style={{ borderRadius: "20px", boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.04)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 18px 40px rgba(31, 38, 135, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 8px 32px 0 rgba(31, 38, 135, 0.04)";
                }}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    {(job.jobType || "private") === "government" ? (
                      isJobExpired(job) ? (
                        <Pill className="bg-red-500 text-white font-bold text-[10px] px-2 py-0.5">
                          📋 Results Out
                        </Pill>
                      ) : (
                        <Pill className="bg-[#F5B700] text-black font-bold text-[10px] px-2 py-0.5">
                          🏛 Government
                        </Pill>
                      )
                    ) : (
                      <Pill className="bg-[#2563EB] text-white font-bold text-[10px] px-2 py-0.5">
                        🏢 Private
                      </Pill>
                    )}
                    {job.type && (
                      <Pill className="bg-[#0F8B6D]/10 text-[#0F8B6D] text-[10px] px-2 py-0.5">
                        {job.type}
                      </Pill>
                    )}
                    {job.experience && (
                      <Pill className="bg-[#F3F4F6] text-[#374151] text-[10px] px-2 py-0.5">
                        {job.experience}
                      </Pill>
                    )}
                  </div>
                  <h3 className="truncate text-base font-bold text-[#111827]">{job.title}</h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-[#6B7280]">
                    <span className="truncate">{job.company}</span>
                    {job.verified && <BadgeCheck className="h-3.5 w-3.5 text-[#0F8B6D] shrink-0" />}
                  </div>
                  <div className="mt-3.5 space-y-1.5 text-xs text-[#6B7280]">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {job.location ? `${job.location}, ` : ""}
                        {job.district || "Statewide"}
                      </span>
                      <span className="rounded-full bg-[#0F8B6D]/10 px-2 py-0.5 text-[9px] font-bold text-[#0F8B6D] shrink-0">
                        {job.distance === null || job.distance === undefined
                          ? "Distance unavailable"
                          : job.distance < 1
                            ? `${Math.round(job.distance * 1000)}m`
                            : `${job.distance.toFixed(1)} km`}
                      </span>
                    </div>
                    {job.deadline && (
                      <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {job.jobType === "government" ? "Last Date: " : "Deadline: "}
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
                <div className="mt-4 pt-3.5 border-t border-[#E8EDF3] flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">
                      {getFormattedPostDate(job)}
                    </p>
                    <p className="text-[13px] font-extrabold text-[#111827]">
                      {job.salary || "Negotiable"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(job.jobType || "private") === "government" ? (
                      <button
                        onClick={() => setRedirectJob(job)}
                        className="flex items-center gap-1.5 rounded-full bg-[#F5B700] hover:bg-[#EAB308] px-3.5 py-1.5 text-[11px] font-bold text-black transition"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {isJobExpired(job) ? "Check Results" : "Apply"}
                      </button>
                    ) : job.status === "filled" ? (
                      <span className="rounded-full bg-[#F3F4F6] px-3.5 py-1.5 text-[11px] font-semibold text-[#6B7280]">
                        Position Filled
                      </span>
                    ) : (
                      <button
                        onClick={() => setApplyJob(job)}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition hover:opacity-90 ${job.applicationMethod === "email"
                          ? "bg-red-500 text-white"
                          : "bg-[#16A34A] text-white"
                          }`}
                      >
                        {job.applicationMethod === "email" ? (
                          <Mail className="h-3.5 w-3.5" />
                        ) : (
                          <MessageCircle className="h-3.5 w-3.5" />
                        )}
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {sortedJobs.length === 0 && !loading && (
            <div className="col-span-full rounded-3xl border border-dashed border-[#E7EAEE] bg-white/50 p-12 text-center">
              <p className="text-sm text-[#6B7280]">
                {geo.lat === null
                  ? "Allow location access to find jobs near you."
                  : "No jobs found near your location."}
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
      <ApplyModal job={applyJob} onClose={() => setApplyJob(null)} />
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
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600 mb-4">
                <ExternalLink className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#111827]">
                {isJobExpired(redirectJob) ? "Checking Results" : "Leaving Jiwika"}
              </h3>
              <p className="mt-2.5 text-sm text-[#6B7280] leading-relaxed">
                {isJobExpired(redirectJob)
                  ? "You are about to visit the official Government portal to check results."
                  : "You are about to visit the official Government recruitment website."}
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
                  className="rounded-xl bg-[#0F8B6D] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0B6B55] flex-1"
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
        className="fixed bottom-24 right-6 z-40 flex items-center gap-2 rounded-full bg-[#0F8B6D] px-5 py-3.5 text-sm font-semibold text-white shadow-float"
      >
        <Phone className="h-5 w-5" /> Contact
      </motion.button>

      {/* Contact modal */}
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
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#0F8B6D]/10 mb-2">
                  <Phone className="h-6 w-6 text-[#0F8B6D]" />
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

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{children}</span>
  );
}

function NearbySelect({
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
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
    </div>
  );
}
