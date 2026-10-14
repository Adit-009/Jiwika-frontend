import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Pencil,
  Trash2,
  Pause,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Briefcase,
  FileText,
  CreditCard,
  User,
  Phone,
  Mail,
  DollarSign,
  Calendar,
  AlertTriangle,
  ExternalLink,
  Check,
  Download,
} from "lucide-react";
import { DISTRICTS, type Job } from "@/lib/mock-data";
import logo from "@/assets/Logo.png";
import {
  getJobByToken,
  updateJobByToken,
  deleteJobByToken,
  pauseJobByToken,
  renewJobByToken,
} from "@/lib/api/jobs.functions";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/manage/$token")({
  head: (): any => ({
    meta: [
      { title: "Manage Job Listing — Jiwika" },
      {
        name: "description",
        content: "Manage your job listing. Edit details, pause, renew, or delete your listing.",
      },
    ],
  }),
  component: ManageJobPage,
});

type EditFormData = {
  companyName: string;
  hrName: string;
  email: string;
  whatsapp: string;
  title: string;
  category: string;
  salary: string;
  type: "Full-time" | "Part-time" | "Internship";
  experience: string;
  qualification: string;
  vacancies: string;
  state: string;
  district: string;
  location?: string;
  address: string;
  description: string;
  benefits: string;
  deadline: string;
  applicationMethod: "whatsapp" | "email" | "both";
  applicationWhatsapp: string;
  applicationEmail: string;

  // Government fields
  jobType: "private" | "government";
  department?: string;
  ageLimit?: string;
  startDate?: string;
  notificationPDF?: string;
  officialWebsite?: string;
  officialApplyLink?: string;
  selectionProcess?: string;
  applicationFee?: string;
  importantInstructions?: string;
  importantDates?: string;
};

const QUALIFICATIONS = [
  "10th Pass",
  "12th Pass",
  "Graduate",
  "Post Graduate",
  "Diploma / ITI",
  "Any Qualification",
];

function ManageJobPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const isDownloadingRef = useRef(false);

  // Modal States
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchJob = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getJobByToken({ data: { token } });
      setJob(result.job);
      setError("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load job details. Token may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Form setup for inline editing
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors: formErrors, isSubmitting: isEditSubmitting },
  } = useForm<EditFormData>();

  const editJobType = watch("jobType") || "private";
  const editDistrict = watch("district");
  const editApplicationMethod = watch("applicationMethod");

  // Prepopulate form when edit modal opens
  const openEditModal = () => {
    if (!job) return;
    setValue("jobType", job.jobType || "private");
    setValue("companyName", job.company);
    setValue("hrName", job.hrName || "");
    setValue("email", job.email || job.contactEmail || "");
    setValue("whatsapp", job.whatsapp || job.whatsappNumber || "");
    setValue("title", job.title);
    setValue("category", job.category || "");
    setValue("salary", job.salary !== "Negotiable" ? job.salary : "");
    setValue("type", job.type || "Full-time");
    setValue("experience", job.experience || "Freshers");
    setValue("qualification", job.qualification || "Any Qualification");
    setValue("vacancies", job.vacancies || "1");
    setValue("state", job.state || "Assam");
    setValue("district", job.district);
    setValue("location", job.location);
    setValue("address", job.address || "");
    setValue("description", job.description || "");
    setValue("benefits", job.benefits || "");
    setValue("deadline", job.deadline || "");
    setValue("applicationMethod", job.applicationMethod || "whatsapp");
    setValue("applicationWhatsapp", job.whatsappNumber || "");
    setValue("applicationEmail", job.contactEmail || "");
    setValue("department", job.department || "");
    setValue("ageLimit", job.ageLimit || "");
    setValue("startDate", job.startDate || "");
    setValue("notificationPDF", job.notificationPDF || "");
    setValue("officialWebsite", job.officialWebsite || "");
    setValue("officialApplyLink", job.officialApplyLink || "");
    setValue("selectionProcess", job.selectionProcess || "");
    setValue("applicationFee", job.applicationFee || "");
    setValue("importantInstructions", job.importantInstructions || "");
    setValue("importantDates", job.importantDates || "");
    setEditOpen(true);
  };

  const handleEditSubmit = async (data: EditFormData) => {
    try {
      const payload = {
        ...data,
      };
      await updateJobByToken({ data: { token, data: payload as any } });
      setEditOpen(false);
      showToast("Job updated! Pending admin approval.", "success");
      fetchJob();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to update job", "error");
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteJobByToken({ data: { token } });
      setDeleteConfirmOpen(false);
      showToast("Job listing deleted successfully.", "success");
      setTimeout(() => navigate({ to: "/" }), 2000);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to delete job", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePause = async () => {
    if (!job) return;
    setActionLoading(true);
    try {
      const nextPauseState = !job.paused;
      const res = await pauseJobByToken({ data: { token, paused: nextPauseState } });
      showToast(res.paused ? "Job post paused (hidden)." : "Job post resumed (active).", "success");
      fetchJob();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to toggle pause status", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async () => {
    setActionLoading(true);
    try {
      const res = await renewJobByToken({ data: { token } });
      showToast(`Job listing renewed successfully! (Count: ${res.renewCount})`, "success");
      fetchJob();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to renew job", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadSummary = async () => {
    if (isDownloadingRef.current || !job) return;
    isDownloadingRef.current = true;
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const managementLink = `${typeof window !== "undefined" ? window.location.origin : ""}/manage/${token}`;
      const jobId = job.jobId || job.id || "";
      const companyName = job.company || "";
      const jobTitle = job.title || "";

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
      doc.setTextColor(248, 250, 252);
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
      doc.addImage(logoDataUrl, "PNG", 15, 14, logoW, logoH);

      doc.setTextColor(107, 114, 128);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Connecting Assam with Opportunities", 15, 29);

      doc.setTextColor(17, 24, 39);
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

      // Verification badge
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.2);
      doc.roundedRect(135, 36, 60, 6, 1, 1, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(21, 128, 61);
      doc.text("VERIFIED SUBMISSION", 143, 40.5);

      // 4. Hero Section Card
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, 48, 180, 32, 4, 4, "FD");

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

      // Status badge
      const statusStr = job?.status || "pending";
      let statusText = "Pending Verification";
      let badgeColors = {
        bg: [254, 243, 199],
        text: [180, 83, 9],
        border: [245, 158, 11],
      };
      if (statusStr === "active") {
        statusText = "Approved & Published";
        badgeColors = {
          bg: [240, 253, 244],
          text: [21, 128, 61],
          border: [34, 197, 94],
        };
      } else if (statusStr === "rejected") {
        statusText = "Submission Rejected";
        badgeColors = {
          bg: [254, 226, 226],
          text: [185, 28, 28],
          border: [239, 68, 68],
        };
      }

      doc.setFillColor(badgeColors.bg[0], badgeColors.bg[1], badgeColors.bg[2]);
      doc.setDrawColor(badgeColors.border[0], badgeColors.border[1], badgeColors.border[2]);
      doc.setLineWidth(0.2);
      doc.roundedRect(125, 53, 62, 7, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(badgeColors.text[0], badgeColors.text[1], badgeColors.text[2]);
      doc.text(statusText, 129, 58);

      doc.setTextColor(107, 114, 128);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("EXPECTED APPROVAL:", 125, 67);
      doc.text("COMPENSATION:", 125, 72);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(17, 24, 39);
      doc.text(statusStr === "active" ? "Immediate (Published)" : "Within 2 to 4 hours", 162, 67);
      doc.text(job?.salary || "Negotiable", 162, 72);

      // 5. Two Column Section
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

      // 6. Location & Support split card
      const cardY2 = 132;
      const cardH2 = 30;

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

      // 7. Secure Management Access Card
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

      // 8. Horizontal Timeline
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

      // 9. Warning notice card
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


      // 10. Footer
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

      // Page Border with 20px padding — drawn last so it renders on top
      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.8);
      doc.roundedRect(7, 7, 196, 283, 3, 3, "S");
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.3);
      doc.roundedRect(9, 9, 192, 279, 2, 2, "S");

      doc.save(`jiwika-job-summary-${jobId || "draft"}.pdf`);
    } finally {
      isDownloadingRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center border border-border bg-card p-6 rounded-3xl shadow-float">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
            <XCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-extrabold text-foreground">Access Denied</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {error || "We couldn't retrieve the job matching this management link."}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Get status color & labels
  const getStatusDetails = () => {
    if (job.deletedAt)
      return {
        bg: "bg-destructive/10 text-destructive border-destructive/20",
        text: "Deleted",
        icon: Trash2,
      };
    if (job.expired)
      return {
        bg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        text: "Expired",
        icon: Clock,
      };
    if (job.status === "pending_payment")
      return {
        bg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        text: "Pending Payment",
        icon: CreditCard,
      };
    if (job.paused)
      return {
        bg: "bg-muted text-muted-foreground border-border",
        text: "Paused (Hidden)",
        icon: Pause,
      };
    if (job.approvalStatus === "pending")
      return {
        bg: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        text: "Pending Review",
        icon: Clock,
      };
    if (job.approvalStatus === "rejected")
      return {
        bg: "bg-destructive/10 text-destructive border-destructive/20",
        text: "Rejected",
        icon: XCircle,
      };
    if (job.status === "active")
      return {
        bg: "bg-success/10 text-success border-success/20",
        text: "Active & Published",
        icon: CheckCircle2,
      };
    return { bg: "bg-muted text-muted-foreground", text: job.status, icon: Briefcase };
  };

  const status = getStatusDetails();
  const StatusIcon = status.icon;

  return (
    <div className="relative min-h-screen overflow-x-hidden flex flex-col justify-between">
      {/* Header */}
      <header className="w-full bg-transparent z-30 relative">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition p-8"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <img
              src={logo}
              alt="Jiwika"
              className="h-16 sm:h-18 w-auto object-contain -my-4 sm:-my-8"
            />
          </Link>
          <span className="text-xs text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-full font-mono font-medium">
            Job ID: {job.jobId || job.id}
          </span>
        </div>
      </header>

      {/* Main Panel */}
      <main className="mx-auto max-w-5xl w-full px-4 pb-12 pt-4 sm:px-6 flex-1">
        {/* Status Alerts banner */}
        {job.status === "pending_payment" && (
          <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-blue-500">Payment Required</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete the Cosmofeed payment to submit your job to the admin team for approval.
                </p>
              </div>
            </div>
            <a
              href={
                process.env.COSMOFEED_PAYMENT_URL ||
                "https://cosmofeed.com/vp/6789abc-dummy-payment"
              }
              className="rounded-xl bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-blue-600 w-full sm:w-auto text-center"
            >
              Pay Now
            </a>
          </div>
        )}

        {job.approvalStatus === "rejected" && (
          <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold">Listing Disapproved</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Reason:</strong>{" "}
                  {job.rejectedReason || "Does not comply with terms of posting."}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Please click <strong>Edit Job Details</strong> below to fix the issues and submit
                  it back for review.
                </p>
              </div>
            </div>
          </div>
        )}

        {job.approvalStatus === "pending" && job.paymentStatus === "paid" && (
          <div className="mb-6 rounded-2xl border border-purple-500/20 bg-card p-4 flex items-start gap-3">
            <Clock className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-purple-500">Manual Verification in Progress</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your payment is verified. The administrator is currently reviewing the job contents.
                Expected publication: <strong>2-4 hours</strong>.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* Left Side: Job Card Preview and Full Details */}
          <div className="space-y-6">
            {/* Header Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card p-4 rounded-2xl shadow-card">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">Status:</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${status.bg}`}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {status.text}
                </span>
              </div>

              {job.renewCount !== undefined && job.renewCount > 0 && (
                <span className="text-xs text-muted-foreground font-medium">
                  Renewed {job.renewCount} time{job.renewCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Seeker View Simulator */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-float relative overflow-hidden">
              <div className="absolute right-4 top-4 bg-muted/60 text-muted-foreground text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-border/60">
                Seeker Card Preview
              </div>

              <div className="flex items-start gap-4 mt-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-foreground">{job.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 font-medium">{job.company}</p>

                  <div className="mt-2.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>
                      {job.location ? `${job.location}, ` : ""}
                      {job.district ? `${job.district}, ` : ""}
                      {job.state}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {(job.jobType || "private") === "government" ? (
                  <span className="rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-600 border border-yellow-500/20">
                    🏛 Government
                  </span>
                ) : (
                  <>
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 border border-blue-500/15">
                      🏢 Private
                    </span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {job.type}
                    </span>
                    <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                      {job.experience}
                    </span>
                  </>
                )}
                {job.category && (
                  <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-500 border border-purple-500/10">
                    {job.category}
                  </span>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-border/40 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Salary</p>
                  <p className="text-base font-extrabold text-foreground">
                    {job.salary || "Negotiable"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Posted Date</p>
                  <p className="text-sm font-semibold text-foreground">{job.posted}</p>
                </div>
              </div>
            </div>

            {/* Listing details */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-6">
              <h3 className="text-md font-bold text-foreground border-b border-border/40 pb-2">
                Full Specifications
              </h3>

              {(job.jobType || "private") === "government" ? (
                /* Government Specs */
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {job.department && (
                      <div>
                        <span className="text-muted-foreground block text-xs">Department</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          {job.department}
                        </span>
                      </div>
                    )}
                    {job.officialWebsite && (
                      <div>
                        <span className="text-muted-foreground block text-xs">
                          Official Website
                        </span>
                        <span className="font-semibold text-foreground mt-0.5 block truncate">
                          <a
                            href={
                              job.officialWebsite.startsWith("http")
                                ? job.officialWebsite
                                : `https://${job.officialWebsite}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {job.officialWebsite} <ExternalLink className="h-3 w-3" />
                          </a>
                        </span>
                      </div>
                    )}
                  </div>

                  {job.description && (
                    <div>
                      <span className="text-muted-foreground block text-xs mb-1">
                        Recruitment Details
                      </span>
                      <p className="text-sm text-foreground bg-secondary/10 border border-border/40 rounded-xl p-3.5 whitespace-pre-wrap leading-relaxed">
                        {job.description}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Private Specs */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Qualification Required
                      </span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {job.qualification || "Not Specified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Number of Vacancies
                      </span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {job.vacancies || "Not Specified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Specific Address / Landmark
                      </span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {job.address || "Not Specified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        Application Method
                      </span>
                      <span className="font-semibold text-foreground mt-0.5 block capitalize">
                        {job.applicationMethod}
                      </span>
                    </div>
                  </div>

                  {job.description && (
                    <div>
                      <span className="text-muted-foreground block text-xs mb-1">
                        Job Description
                      </span>
                      <p className="text-sm text-foreground bg-secondary/10 border border-border/40 rounded-xl p-3.5 whitespace-pre-wrap leading-relaxed">
                        {job.description}
                      </p>
                    </div>
                  )}

                  {job.benefits && (
                    <div>
                      <span className="text-muted-foreground block text-xs mb-1">
                        Perks & Benefits
                      </span>
                      <p className="text-sm text-foreground bg-success/5 border border-success/10 rounded-xl p-3.5 whitespace-pre-wrap leading-relaxed">
                        {job.benefits}
                      </p>
                    </div>
                  )}
                </>
              )}

              {job.deadline && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-accent/20 px-3.5 py-2 text-xs font-semibold text-accent-foreground border border-accent/10">
                  <Calendar className="h-4 w-4" />
                  {job.jobType === "government"
                    ? "Last Date to Apply:"
                    : "Application Deadline:"}{" "}
                  {isNaN(Date.parse(job.deadline))
                    ? job.deadline
                    : new Date(job.deadline).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Actions Panel */}
          <div className="border border-border bg-card p-6 rounded-3xl shadow-card space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Management Panel</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Control actions for this listing.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Edit Job */}
              <button
                onClick={openEditModal}
                disabled={actionLoading}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-95 transition disabled:opacity-60"
              >
                <Pencil className="h-4 w-4" />
                Edit Job Details
              </button>

              {/* Pause / Resume */}
              <button
                onClick={handleTogglePause}
                disabled={actionLoading || !!job.deletedAt || job.status === "pending_payment"}
                className={`flex items-center justify-center gap-2 w-full rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-60 shadow-card ${job.paused
                  ? "border-success/30 bg-success/5 text-success hover:bg-success/10"
                  : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
              >
                {job.paused ? (
                  <>
                    <Play className="h-4 w-4" />
                    Resume Listing
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause Listing
                  </>
                )}
              </button>

              {/* Renew Job */}
              <button
                onClick={handleRenew}
                disabled={actionLoading || !!job.deletedAt || job.status === "pending_payment"}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground hover:bg-muted transition disabled:opacity-60 shadow-card"
              >
                <RefreshCw className={`h-4 w-4 ${actionLoading ? "animate-spin" : ""}`} />
                Renew (Bump to Top)
              </button>

              {/* Download Summary PDF */}
              <button
                onClick={handleDownloadSummary}
                disabled={actionLoading}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-primary/30 bg-primary/5 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition disabled:opacity-60 shadow-card"
              >
                <Download className="h-4 w-4" />
                Download Summary PDF
              </button>

              <div className="border-t border-border/40 my-1 pt-3.5">
                {/* Delete Job */}
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={actionLoading || !!job.deletedAt}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10 transition disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Listing
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border/75 bg-secondary/15 p-3.5 text-xs text-muted-foreground space-y-2.5">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p>
                  <strong>No login required.</strong> You can bookmark this page URL to manage this
                  listing later.
                </p>
              </div>
              <div className="flex gap-2">
                <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p>Editing a live listing will temporarily hide it for admin re-verification.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Job Modal */}
      <AnimatePresence>
        {editOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center"
            onClick={() => setEditOpen(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-card p-4 sm:p-6 shadow-float sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setEditOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <XCircle className="h-5 w-5" />
              </button>

              <h2 className="text-xl sm:text-2xl font-bold">Edit Job Listing</h2>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Your changes will require admin re-approval before they go live.
              </p>

              <form onSubmit={handleSubmit(handleEditSubmit)} className="mt-6 space-y-6">
                {/* Job Type Selector */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-primary block mb-2.5">
                    Job Type *
                  </span>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Private Job Card */}
                    <div
                      onClick={() => setValue("jobType", "private")}
                      className={`relative flex cursor-pointer flex-col rounded-2xl border p-4 transition-all hover:shadow-md ${editJobType === "private"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:border-primary/45"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold flex items-center gap-2 text-foreground">
                          <span className="text-lg">🏢</span> Private Job
                        </span>
                        {editJobType === "private" && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                        For companies, startups, shops, institutes and organizations hiring
                        candidates.
                      </p>
                    </div>

                    {/* Government Job Card */}
                    <div
                      onClick={() => setValue("jobType", "government")}
                      className={`relative flex cursor-pointer flex-col rounded-2xl border p-4 transition-all hover:shadow-md ${editJobType === "government"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:border-primary/45"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold flex items-center gap-2 text-foreground">
                          <span className="text-lg">🏛</span> Government Job
                        </span>
                        {editJobType === "government" && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                        For official Government recruitment notifications.
                      </p>
                    </div>
                  </div>
                </div>

                {editJobType === "private" ? (
                  /* ────────────────────────────────────────────────────────
                     PRIVATE JOB FORM FIELDS
                     ──────────────────────────────────────────────────────── */
                  <>
                    <Section title="Company Information">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Company Name *" error={formErrors.companyName?.message}>
                          <input
                            {...register("companyName", {
                              required: editJobType === "private" ? "Required" : false,
                            })}
                            className="input"
                          />
                        </Field>
                        <Field label="HR Name *" error={formErrors.hrName?.message}>
                          <input
                            {...register("hrName", {
                              required: editJobType === "private" ? "Required" : false,
                            })}
                            className="input"
                          />
                        </Field>
                        <Field label="HR Email Address *" error={formErrors.email?.message}>
                          <input
                            type="email"
                            {...register("email", {
                              required: editJobType === "private" ? "Required" : false,
                            })}
                            className="input"
                          />
                        </Field>
                        <Field label="HR WhatsApp Number *" error={formErrors.whatsapp?.message}>
                          <input
                            {...register("whatsapp", {
                              required: editJobType === "private" ? "Required" : false,
                            })}
                            className="input"
                          />
                        </Field>
                      </div>
                    </Section>

                    <Section title="Job Details">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Job Title *" error={formErrors.title?.message}>
                          <input
                            {...register("title", { required: "Required" })}
                            className="input"
                          />
                        </Field>

                        <Field label="Job Post *" error={formErrors.category?.message}>
                          <input
                            {...register("category", {
                              required: editJobType === "private" ? "Required" : false,
                            })}
                            className="input"
                            placeholder="e.g. Sales Executive, Delivery Boy"
                          />
                        </Field>

                        <Field label="Salary Range" error={formErrors.salary?.message}>
                          <input
                            {...register("salary")}
                            className="input"
                            placeholder="e.g. ₹15-25k/mo or Negotiable"
                          />
                        </Field>

                        <Field label="Vacancies *" error={formErrors.vacancies?.message}>
                          <input
                            type="number"
                            min="1"
                            {...register("vacancies", {
                              required: editJobType === "private" ? "Required" : false,
                            })}
                            className="input"
                          />
                        </Field>

                        <Field label="Job Type *" error={formErrors.type?.message}>
                          <select
                            {...register("type", {
                              required: editJobType === "private" ? "Required" : false,
                            })}
                            className="input"
                          >
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Internship">Internship</option>
                          </select>
                        </Field>

                        <Field label="Experience Required *" error={formErrors.experience?.message}>
                          <select
                            {...register("experience", {
                              required: editJobType === "private" ? "Required" : false,
                            })}
                            className="input"
                          >
                            <option value="Freshers">Freshers</option>
                            <option value="1 year exp">1 year exp</option>
                            <option value="2 years exp">2 years exp</option>
                            <option value="3+ years">3+ years</option>
                          </select>
                        </Field>

                        <Field
                          label="Qualification Required *"
                          error={formErrors.qualification?.message}
                        >
                          <select
                            {...register("qualification", {
                              required: editJobType === "private" ? "Required" : false,
                            })}
                            className="input"
                          >
                            {QUALIFICATIONS.map((q) => (
                              <option key={q} value={q}>
                                {q}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="Application Deadline" error={formErrors.deadline?.message}>
                          <input type="date" {...register("deadline")} className="input" />
                        </Field>
                      </div>
                    </Section>

                    <Section title="Location Specifications">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="State *" error={formErrors.state?.message}>
                          <select
                            {...register("state", { required: "Required" })}
                            className="input"
                            disabled
                          >
                            <option value="Assam">Assam</option>
                          </select>
                        </Field>
                        <Field label="District *" error={formErrors.district?.message}>
                          <select
                            {...register("district", { required: "Required" })}
                            className="input"
                          >
                            <option value="">Select District</option>
                            {Object.keys(DISTRICTS).map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Address / Landmark" error={formErrors.address?.message}>
                          <input {...register("address")} className="input" />
                        </Field>
                      </div>
                    </Section>

                    <Section title="Description & Perks">
                      <div className="grid grid-cols-1 gap-3">
                        <Field label="Job Description">
                          <textarea
                            {...register("description")}
                            rows={3}
                            className="input resize-none"
                          />
                        </Field>
                        <Field label="Benefits">
                          <textarea
                            {...register("benefits")}
                            rows={2}
                            className="input resize-none"
                          />
                        </Field>
                      </div>
                    </Section>

                    <Section title="Recruitment Contact Method">
                      <p className="mb-3 text-[10px] sm:text-xs text-muted-foreground">
                        How should seekers reach you?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            { value: "whatsapp", label: "WhatsApp" },
                            { value: "email", label: "Email" },
                            { value: "both", label: "Both" },
                          ] as const
                        ).map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex cursor-pointer items-center gap-1.5 sm:gap-2 rounded-xl border px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition ${editApplicationMethod === opt.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-foreground hover:border-primary/30"
                              }`}
                          >
                            <input
                              type="radio"
                              value={opt.value}
                              {...register("applicationMethod")}
                              className="sr-only"
                            />
                            <span
                              className={`h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full border-2 transition ${editApplicationMethod === opt.value
                                ? "border-primary bg-primary"
                                : "border-muted-foreground/40"
                                }`}
                            >
                              {editApplicationMethod === opt.value && (
                                <span className="block h-full w-full scale-50 rounded-full bg-primary-foreground" />
                              )}
                            </span>
                            {opt.label}
                          </label>
                        ))}
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {(editApplicationMethod === "whatsapp" ||
                          editApplicationMethod === "both") && (
                            <Field
                              label="WhatsApp Number *"
                              error={formErrors.applicationWhatsapp?.message}
                            >
                              <input
                                {...register("applicationWhatsapp", {
                                  required:
                                    editApplicationMethod === "whatsapp" ||
                                      editApplicationMethod === "both"
                                      ? "Required"
                                      : false,
                                })}
                                className="input"
                              />
                            </Field>
                          )}
                        {(editApplicationMethod === "email" ||
                          editApplicationMethod === "both") && (
                            <Field
                              label="Email Address *"
                              error={formErrors.applicationEmail?.message}
                            >
                              <input
                                type="email"
                                {...register("applicationEmail", {
                                  required:
                                    editApplicationMethod === "email" ||
                                      editApplicationMethod === "both"
                                      ? "Required"
                                      : false,
                                })}
                                className="input"
                              />
                            </Field>
                          )}
                      </div>
                    </Section>
                  </>
                ) : (
                  /* ────────────────────────────────────────────────────────
                     GOVERNMENT JOB FORM FIELDS
                     ──────────────────────────────────────────────────────── */
                  <>
                    <Section title="Recruitment Details">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Recruitment Title *" error={formErrors.title?.message}>
                          <input
                            {...register("title", { required: "Required" })}
                            className="input"
                          />
                        </Field>
                        <Field
                          label="Recruiting Organization *"
                          error={formErrors.companyName?.message}
                        >
                          <input
                            {...register("companyName", { required: "Required" })}
                            className="input"
                          />
                        </Field>
                        <Field label="Department" error={formErrors.department?.message}>
                          <input {...register("department")} className="input" />
                        </Field>
                        <Field
                          label="Official Website *"
                          error={formErrors.officialWebsite?.message}
                        >
                          <input
                            {...register("officialWebsite", { required: "Required" })}
                            className="input"
                          />
                        </Field>
                        <Field label="Application Deadline *" error={formErrors.deadline?.message}>
                          <input
                            type="date"
                            {...register("deadline", { required: "Required" })}
                            className="input"
                          />
                        </Field>
                      </div>
                    </Section>
                  </>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="rounded-xl border border-border bg-background px-4 py-3 text-xs sm:text-sm font-medium hover:bg-muted w-full sm:flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditSubmitting}
                    className="rounded-xl bg-gradient-primary px-4 py-3 text-xs sm:text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-60 w-full sm:flex-1"
                  >
                    {isEditSubmitting ? "Saving..." : "Submit for Verification"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
            onClick={() => setDeleteConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-float text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Delete Listing?</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to delete this job listing? This action is permanent and
                candidates will no longer be able to view it.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold hover:bg-muted w-full sm:flex-1"
                >
                  Keep Job
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="rounded-xl bg-destructive px-4 py-2.5 text-xs font-semibold text-destructive-foreground shadow-soft transition hover:opacity-90 disabled:opacity-60 w-full sm:flex-1"
                >
                  {actionLoading ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
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

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-muted-foreground mt-12 border-t border-border/10">
        © 2026 Jiwika. All rights reserved.
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-primary border-b border-border/40 pb-1">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium text-foreground uppercase tracking-wide">
        {label.endsWith(" *") ? (
          <>
            {label.slice(0, -2)} <span className="text-destructive">*</span>
          </>
        ) : label.endsWith("*") ? (
          <>
            {label.slice(0, -1)}
            <span className="text-destructive">*</span>
          </>
        ) : (
          label
        )}
      </span>
      <div className="mt-0.5">{children}</div>
      {error && <span className="mt-0.5 block text-xs text-destructive">{error}</span>}
    </label>
  );
}
