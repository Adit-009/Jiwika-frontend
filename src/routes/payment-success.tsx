import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Copy,
  Check,
  Download,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  MapPin,
  CreditCard,
  AlertCircle,
  Loader2,
} from "lucide-react";
import logo from "@/assets/Logo.png";
import { getPaymentSetting, submitJobPayment, getJobByToken } from "@/lib/api/jobs.functions";
import { jsPDF } from "jspdf";
import { type Job } from "@/lib/mock-data";

// Validate search query parameters
const searchSchema = z.object({
  jobId: z.string().optional(),
  token: z.string().optional(),
  paymentRequired: z.union([z.string(), z.boolean()]).optional(),
});

export const Route = createFileRoute("/payment-success")({
  validateSearch: (search) => searchSchema.parse(search),
  head: (): any => ({
    meta: [
      { title: "Job Posted Successfully — Jiwika" },
      {
        name: "description",
        content: "Your job listing was created successfully. View your Job ID and Management Link.",
      },
    ],
  }),
  component: PaymentSuccessPage,
});

function PaymentSuccessPage() {
  const search = Route.useSearch();
  const [jobId, setJobId] = useState(search.jobId || "");
  const [token, setToken] = useState(search.token || "");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [job, setJob] = useState<Job | null>(null);

  const isSubmittingRef = useRef(false);
  const isDownloadingRef = useRef(false);

  const [copiedJobId, setCopiedJobId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Payment states
  const [paymentRequired, setPaymentRequired] = useState(
    search.paymentRequired === "true" || search.paymentRequired === true,
  );
  const [upiId, setUpiId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [qrCodeImage, setQrCodeImage] = useState("");
  const [upiTxnId, setUpiTxnId] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const fetchSetting = async () => {
      try {
        const result = await getPaymentSetting();
        setUpiId(result.upiId);
        setAmount(result.amount);
        setQrCodeImage(result.qrCodeImage || "");
        if (search.paymentRequired === undefined) {
          setPaymentRequired(result.paymentsEnabled);
        }
      } catch (err) {
        console.error("Failed to fetch payment config", err);
      }
    };
    fetchSetting();
  }, [search.paymentRequired]);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitError("");

    if (!/^\d{12}$/.test(upiTxnId.trim())) {
      setSubmitError("UPI Transaction ID (UTR) must be exactly 12 digits.");
      isSubmittingRef.current = false;
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitJobPayment({
        data: {
          jobId,
          token,
          upiTxnId: upiTxnId.trim(),
        },
      });
      if (result.success) {
        setPaymentSubmitted(true);
      } else {
        setSubmitError(result.message || "Failed to submit payment reference.");
      }
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit payment reference.");
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Load companyName, jobTitle, and fallback credentials
  useEffect(() => {
    let resolvedJobId = jobId;
    let resolvedToken = token;

    // 1. Fallback to localStorage if URL params are missing
    if (!resolvedJobId || !resolvedToken) {
      try {
        const stored = localStorage.getItem("jiwika_last_created_job");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!resolvedJobId && parsed.jobId) {
            resolvedJobId = parsed.jobId;
            setJobId(parsed.jobId);
          }
          if (!resolvedToken && parsed.managementToken) {
            resolvedToken = parsed.managementToken;
            setToken(parsed.managementToken);
          }
          setJob(parsed);
          if (parsed.company) setCompanyName(parsed.company);
          if (parsed.companyName) setCompanyName(parsed.companyName);
          if (parsed.title) setJobTitle(parsed.title);
        }
      } catch (err) {
        console.error("Failed to read last created job from localStorage", err);
      }
    }

    // 2. If we do have the params (e.g. from URL redirect), check localStorage for details matching the jobId
    if (resolvedJobId) {
      try {
        const stored = localStorage.getItem("jiwika_last_created_job");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.jobId === resolvedJobId) {
            setJob(parsed);
            if (parsed.company) setCompanyName(parsed.company);
            if (parsed.companyName) setCompanyName(parsed.companyName);
            if (parsed.title) setJobTitle(parsed.title);
          }
        }
      } catch (err) {
        console.error("Failed to read last created job from localStorage", err);
      }
    }

    // 3. Fallback: If not found in localStorage or mismatch, fetch job details from backend
    const fetchJobDetails = async () => {
      const activeToken = resolvedToken || token;
      if (!activeToken) return;
      try {
        const result = await getJobByToken({ data: { token: activeToken } });
        if (result && result.job) {
          setJob(result.job);
          setCompanyName(result.job.company);
          setJobTitle(result.job.title);
        }
      } catch (err) {
        console.error("Failed to fetch job details from API", err);
      }
    };

    fetchJobDetails();
  }, [jobId, token]);

  const [managementLink, setManagementLink] = useState(`/manage/${token}`);

  useEffect(() => {
    if (typeof window !== "undefined" && token) {
      setManagementLink(`${window.location.origin}/manage/${token}`);
    }
  }, [token]);

  const copyToClipboard = (text: string, type: "jobId" | "link" | "upi") => {
    navigator.clipboard.writeText(text);
    if (type === "jobId") {
      setCopiedJobId(true);
      setTimeout(() => setCopiedJobId(false), 2000);
    } else if (type === "upi") {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDownloadSummary = async () => {
    if (isDownloadingRef.current) return;
    isDownloadingRef.current = true;
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const formatExactDate = (dateSource?: string) => {
        const d = dateSource ? new Date(dateSource) : new Date();
        if (isNaN(d.getTime())) {
          return (
            new Date().toLocaleDateString("en-US", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }) +
            " • " +
            new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }) +
            " IST"
          );
        }
        return (
          d.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }) +
          " • " +
          d.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }) +
          " IST"
        );
      };

      // 1. Watermark in Background
      doc.setFont("helvetica", "bold");
      doc.setFontSize(80);
      doc.setTextColor(248, 250, 252); // extremely soft slate-50 color
      doc.text("JIWIKA ENTERPRISE", 30, 180, { angle: 35 });

      // 2. Logo from assets
      const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = logo;
      });
      const logoCanvas = document.createElement("canvas");
      logoCanvas.width = logoImg.naturalWidth;
      logoCanvas.height = logoImg.naturalHeight;
      const logoCtx = logoCanvas.getContext("2d")!;
      logoCtx.drawImage(logoImg, 0, 0);
      const logoDataUrl = logoCanvas.toDataURL("image/png");
      const logoH = 12;
      const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
      doc.addImage(logoDataUrl, "PNG", 16, 14, logoW, logoH);

      doc.setTextColor(107, 114, 128); // Slate 500
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      doc.setTextColor(17, 24, 39); // Slate 900
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("JOB POSTING CONFIRMATION", 15, 36);

      // 3. Top Right metadata details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text("JOB ID:", 135, 18);
      doc.text("GENERATED:", 135, 23);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(17, 24, 39);
      doc.text(jobId || "PENDING", 160, 18);
      doc.text(formatExactDate(job?.createdAt), 160, 23);

      // Verification badge top right
      doc.setFillColor(240, 253, 244); // light green bg
      doc.setDrawColor(34, 197, 94); // success green border
      doc.setLineWidth(0.2);
      doc.roundedRect(135, 36, 60, 6, 1, 1, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(21, 128, 61); // dark green
      doc.text("VERIFIED SUBMISSION", 143, 40.5);

      // 4. Hero Section Card (y: 48)
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, 48, 180, 32, 4, 4, "FD");

      // Left column inside card
      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(companyName || "N/A", 22, 56);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 118, 110);
      doc.text(jobTitle || "N/A", 22, 62);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      doc.text(`Category: ${job?.category || "General"}`, 22, 67);
      doc.text(`Type: ${job?.type || "Full-time"}`, 22, 72);
      doc.text(`Location: ${job?.location || "Assam"} (${job?.district || "Any"})`, 22, 77);

      // Right column inside card: Status badge
      const statusStr = job?.status || "pending";
      let statusText = "Pending Verification";
      let badgeColors = {
        bg: [254, 243, 199],
        text: [180, 83, 9],
        border: [245, 158, 11],
      }; // yellow

      if (statusStr === "active") {
        statusText = "Approved & Published";
        badgeColors = {
          bg: [240, 253, 244],
          text: [21, 128, 61],
          border: [34, 197, 94],
        }; // green
      } else if (statusStr === "rejected") {
        statusText = "Submission Rejected";
        badgeColors = {
          bg: [254, 226, 226],
          text: [185, 28, 28],
          border: [239, 68, 68],
        }; // red
      }

      doc.setFillColor(badgeColors.bg[0], badgeColors.bg[1], badgeColors.bg[2]);
      doc.setDrawColor(badgeColors.border[0], badgeColors.border[1], badgeColors.border[2]);
      doc.setLineWidth(0.2);
      doc.roundedRect(125, 53, 62, 7, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(badgeColors.text[0], badgeColors.text[1], badgeColors.text[2]);
      doc.text(statusText, 129, 58);

      // Expected approval / salary
      doc.setTextColor(107, 114, 128);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("EXPECTED APPROVAL:", 125, 67);
      doc.text("COMPENSATION:", 125, 72);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(17, 24, 39);
      doc.text(statusStr === "active" ? "Immediate (Published)" : "Within 2 to 4 hours", 162, 67);
      doc.text(job?.salary || "Negotiable", 162, 72);

      // 5. Two Column Section (y: 85)
      const cardY = 85;
      const cardH = 42;

      // Left Card: Company Info
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, cardY, 87, cardH, 4, 4, "FD");

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, cardY, 87, 8, 4, 4, "F");
      doc.line(15, cardY + 8, 102, cardY + 8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 118, 110);
      doc.text("COMPANY INFORMATION", 20, cardY + 5.5);

      doc.setFontSize(8);
      let detailY = cardY + 14;
      const addCompRow = (lbl: string, val: string) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(107, 114, 128);
        doc.text(lbl, 20, detailY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(17, 24, 39);
        doc.text(val, 45, detailY);
        detailY += 6.5;
      };
      addCompRow("Company Name:", companyName || "N/A");
      addCompRow("HR/Contact:", job?.hrName || "Contact Person");
      addCompRow("Contact Email:", job?.email || "N/A");
      addCompRow("Contact Phone:", job?.whatsapp ? `+91 ${job.whatsapp}` : "N/A");

      // Right Card: Job Info
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.roundedRect(108, cardY, 87, cardH, 4, 4, "FD");

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(108, cardY, 87, 8, 4, 4, "F");
      doc.line(108, cardY + 8, 195, cardY + 8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 118, 110);
      doc.text("JOB SPECIFICATIONS", 113, cardY + 5.5);

      detailY = cardY + 14;
      const addJobRow = (lbl: string, val: string) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(107, 114, 128);
        doc.text(lbl, 113, detailY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(17, 24, 39);
        doc.text(val, 142, detailY);
        detailY += 6.5;
      };
      addJobRow("Experience:", job?.experience || "Freshers Welcome");
      addJobRow("Qualification:", job?.qualification || "Not specified");
      addJobRow("Vacancies:", job?.vacancies ? String(job.vacancies) : "Not specified");
      addJobRow("Deadline:", job?.deadline || "N/A");

      // 6. Location & Help/Support split card (y: 132)
      const cardY2 = 132;
      const cardH2 = 30;

      // Left card: Location Info
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, cardY2, 87, cardH2, 4, 4, "FD");

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, cardY2, 87, 8, 4, 4, "F");
      doc.line(15, cardY2 + 8, 102, cardY2 + 8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 118, 110);
      doc.text("LOCATION INFORMATION", 20, cardY2 + 5.5);

      detailY = cardY2 + 14;
      const addLocRow = (lbl: string, val: string) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(107, 114, 128);
        doc.text(lbl, 20, detailY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(17, 24, 39);
        const splitVal = doc.splitTextToSize(val, 50);
        doc.text(splitVal, 45, detailY);
        detailY += splitVal.length * 4 + 2;
      };
      addLocRow("District:", job?.district || "N/A");
      addLocRow("Full Address:", job?.address || "Assam, India");

      // Right card: Support Info
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.roundedRect(108, cardY2, 87, cardH2, 4, 4, "FD");

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(108, cardY2, 87, 8, 4, 4, "F");
      doc.line(108, cardY2 + 8, 195, cardY2 + 8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 118, 110);
      doc.text("HELP & SUPPORT", 113, cardY2 + 5.5);

      detailY = cardY2 + 14;
      const addSuppRow = (lbl: string, val: string) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(107, 114, 128);
        doc.text(lbl, 113, detailY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(17, 24, 39);
        doc.text(val, 142, detailY);
        detailY += 6.5;
      };
      addSuppRow("WhatsApp Support:", "+91 93426 36875");
      addSuppRow("Email Support:", "cbora9723@gmail.com");

      // 7. Secure Management Access Card (y: 167)
      const manageY = 167;
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.4);
      doc.roundedRect(15, manageY, 180, 36, 4, 4, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(21, 128, 61);
      doc.text("SECURE EMPLOYER MANAGEMENT LINK", 20, manageY + 6.5);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.roundedRect(20, manageY + 10, 150, 9, 1, 1, "FD");

      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 118, 110);
      const splitManageLink = doc.splitTextToSize(managementLink, 140);
      doc.text(splitManageLink, 24, manageY + 15.5);


      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        "This secure management link allows you to Renew, Pause, Resume, Edit, or Delete your job posting",
        20,
        manageY + 25,
      );
      doc.text(
        "directly without creating an account. Keep this link confidential; anyone with access can modify your post.",
        20,
        manageY + 29.5,
      );

      // 8. Horizontal Timeline (y: 212)
      const isApproved = statusStr === "active";
      const timelineY = 212;
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(1);
      doc.line(30, timelineY, 180, timelineY);

      doc.setDrawColor(15, 118, 110);
      doc.line(30, timelineY, isApproved ? 180 : 105, timelineY);

      const steps = [
        { label: "Submitted", x: 30, active: true },
        { label: "Verification", x: 67.5, active: true },
        { label: "Review", x: 105, active: true },
        { label: "Approval", x: 142.5, active: isApproved },
        { label: "Published", x: 180, active: isApproved },
      ];

      steps.forEach((step) => {
        if (step.active) {
          doc.setFillColor(15, 118, 110);
          doc.setDrawColor(15, 118, 110);
        } else {
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(209, 213, 219);
        }
        doc.setLineWidth(1.2);
        doc.circle(step.x, timelineY, 2, "FD");

        doc.setFont("helvetica", step.active ? "bold" : "normal");
        doc.setFontSize(7.5);
        if (step.active) {
          doc.setTextColor(15, 118, 110);
        } else {
          doc.setTextColor(156, 163, 175);
        }
        doc.text(step.label, step.x, timelineY + 6, { align: "center" });
      });

      // 9. Warning notice card (y: 226)
      const warnY = 226;
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, warnY, 180, 20, 4, 4, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(180, 83, 9);
      doc.text("SECURITY WARNING & SYSTEM RULES", 20, warnY + 5.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 113, 108);
      doc.text(
        "• Keep your Management Link private. Anyone possessing this link can modify or remove your job posting.",
        20,
        warnY + 10.5,
      );
      doc.text(
        "• Jiwika will never ask you to share this secure link. Save this document securely for future reference.",
        20,
        warnY + 15,
      );


      // 10. Footer (y: 278)
      const footerY = 278;
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.4);
      doc.line(15, footerY, 190, footerY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 118, 110);
      doc.text("Jiwika", 15, footerY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text("Connecting Assam with Opportunities", 15, footerY + 10.5);
      doc.text("© 2026 Jiwika Technologies. All Rights Reserved.", 15, footerY + 15);

      doc.setFont("helvetica", "semibold");
      doc.setTextColor(71, 85, 105);
      doc.text("Website: www.jiwika.in", 150, footerY + 6);
      doc.text("T&C: www.jiwika.in/terms", 150, footerY + 10.5);
      doc.text("Support: cbora9723@gmail.com", 150, footerY + 15);

      doc.save(`jiwika-job-summary-${jobId || "draft"}.pdf`);
    } finally {
      isDownloadingRef.current = false;
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden flex flex-col justify-between">
      {/* Header */}
      <header className="w-full bg-transparent pt-5 z-30 relative">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        ></Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`w-full rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-float text-center transition-all duration-300 ${paymentRequired && !paymentSubmitted ? "max-w-lg lg:max-w-4xl" : "max-w-lg"
            }`}
        >
          {paymentRequired && !paymentSubmitted ? (
            /* ─── UPI Checkout Screen ─── */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start text-center lg:text-left">
              {/* Left Column */}
              <div className="space-y-5">
                <div>
                  {/* Payment Icon */}
                  <div className="mx-auto lg:mx-0 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mb-6">
                    <CreditCard className="h-8 w-8 animate-pulse" />
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    Activate Your Listing
                  </h1>
                  <div className="mt-4 mb-2 flex items-baseline gap-2 bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-4 w-fit mx-auto lg:mx-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 self-center">
                      Amount Due:
                    </span>
                    <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                      ₹{amount}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Scan the UPI QR code to complete the payment and publish your job post.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Receiver UPI ID
                    </span>
                    <div className="flex items-center justify-between bg-card border border-border rounded-xl p-2.5 text-xs font-mono">
                      <span className="truncate flex-1 select-all text-left">{upiId}</span>
                      <button
                        onClick={() => copyToClipboard(upiId, "upi")}
                        className="flex items-center gap-1 shrink-0 bg-secondary/20 hover:bg-secondary/40 border border-border px-2 py-1 rounded-lg text-[10px] font-bold text-foreground transition"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="h-3 w-3 text-success" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy UPI
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitPayment} className="pt-2 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5 text-left">
                        12-Digit UPI Transaction ID (UTR) *
                      </label>
                      <input
                        type="text"
                        maxLength={12}
                        pattern="\d{12}"
                        value={upiTxnId}
                        onChange={(e) => {
                          setUpiTxnId(e.target.value.replace(/\D/g, ""));
                          setSubmitError("");
                        }}
                        placeholder="e.g. 320987654321"
                        className="input text-center text-sm tracking-widest font-mono font-bold"
                        required
                      />
                      <p className="text-[9px] text-muted-foreground mt-1 text-left">
                        Enter the UTR reference number from your payment confirmation screen.
                      </p>
                    </div>

                    {submitError && (
                      <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive text-left">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || upiTxnId.length !== 12}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-60"
                    >
                      {submitting ? (
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4.5 w-4.5" />
                      )}
                      {submitting ? "Submitting..." : "Submit Transaction ID"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Dynamic QR Code */}
                <div className="flex flex-col items-center justify-center p-4 bg-secondary/15 rounded-2xl border border-border/80 shadow-inner">
                  <img
                    src={
                      qrCodeImage ||
                      `https://chart.googleapis.com/chart?chs=180x180&cht=qr&chl=${encodeURIComponent(
                        `upi://pay?pa=${upiId}&pn=Jiwika&am=${amount}&cu=INR`,
                      )}`
                    }
                    alt="Scan QR code to pay"
                    className="h-44 w-44 object-contain shadow-md rounded-xl bg-white p-2.5"
                  />
                  <p className="text-[10px] font-semibold text-muted-foreground mt-2.5 text-center">
                    Scan QR with GPay, PhonePe, Paytm, or BHIM
                  </p>
                </div>

                <div className="border-t border-border/40 pt-4 flex flex-col gap-3">
                  <div className="text-left p-3.5 bg-secondary/10 rounded-xl border border-border/50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Listing Backup Details
                    </p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Job ID: <strong className="text-foreground">{jobId}</strong>
                      <br />
                      Secure Management Link:{" "}
                      <span className="font-mono text-[10px] block break-all mt-0.5 p-1 bg-card border border-border/40 rounded font-normal text-muted-foreground select-all">
                        {managementLink}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadSummary}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:border-primary/40 transition shadow-card w-full"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Summary PDF
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ─── Success Screen (Paid Reference Submitted OR Free listing) ─── */
            <>
              {/* Success Badge */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success mb-6">
                <CheckCircle2 className="h-10 w-10 animate-bounce" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {paymentSubmitted ? "Reference Submitted!" : "Job Posted Successfully"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {paymentSubmitted
                  ? "Thank you! We will verify your transaction reference."
                  : "Thank you! Your job posting has been submitted."}
              </p>

              {/* Details Card */}
              <div className="mt-8 rounded-2xl border border-border/80 bg-secondary/10 p-4 sm:p-5 text-left space-y-4">
                {/* Job ID Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Job ID
                    </p>
                    <p className="text-sm font-extrabold text-foreground mt-0.5">
                      {jobId || "Generating..."}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(jobId, "jobId")}
                    className="flex items-center gap-1.5 self-start sm:self-center rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition shadow-card"
                  >
                    {copiedJobId ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-success" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {/* Management Link Row */}
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Secure Management Link
                    </p>
                    <p className="text-xs text-muted-foreground break-all font-mono bg-card border border-border/50 rounded-lg p-2 mt-1 select-all">
                      {managementLink}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <button
                      onClick={() => copyToClipboard(managementLink, "link")}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition shadow-card"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-success" />
                          Copied Link
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Link
                        </>
                      )}
                    </button>
                    {token && (
                      <Link
                        to="/manage/$token"
                        params={{ token: token }}
                        className="flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary transition"
                      >
                        Manage Job
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleDownloadSummary}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs sm:text-sm font-semibold hover:border-primary/40 transition shadow-card w-full sm:flex-1"
                >
                  <Download className="h-4 w-4" />
                  Download Summary PDF
                </button>
                <a
                  href="https://wa.me/919876543210?text=I%20need%20support%20with%20my%20Jiwika%20job%20post"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-xs sm:text-sm font-semibold text-success hover:bg-success/10 transition w-full sm:flex-1"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Support
                </a>
              </div>

              {/* Important Notice */}
              <div className="mt-8 rounded-2xl border border-warning/20 bg-warning/5 p-4 text-left">
                <div className="flex items-start gap-3 text-warning">
                  <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wide">
                      {paymentSubmitted ? "Verification Pending" : "Approval Pending"}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed opacity-90">
                      {paymentSubmitted
                        ? "Your payment reference is being verified. Once payment is confirmed, the listing will undergo content review and go live within 2 to 4 hours."
                        : "Your job listing is currently undergoing manual verification. It will become visible on the Jiwika job seeker search board within 2 to 4 hours once verified."}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mt-8">
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:text-foreground transition underline font-medium"
            >
              Go back to Jiwika home
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-muted-foreground">
        © 2026 Jiwika. All rights reserved.
      </footer>
    </div>
  );
}
