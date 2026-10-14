import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { X, Check, Link as LinkIcon, ExternalLink } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { DISTRICTS } from "@/lib/mock-data";
import { postJob } from "@/lib/api/jobs.functions";

type FormData = {
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

  // Government Job fields
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

const CATEGORIES = [
  "Admin & HR",
  "Logistics & Delivery",
  "Education & Teaching",
  "Healthcare & Pharma",
  "IT & Software",
  "Retail & Sales",
  "Hotel & Restaurant",
  "Finance & Banking",
  "Construction & Engineering",
  "Other",
];

const GOV_CATEGORIES = [
  "Police",
  "Railway",
  "Teaching",
  "Banking",
  "Defence",
  "Medical",
  "Engineering",
  "Administration",
  "Judiciary",
  "Forest",
  "Other",
];

const QUALIFICATIONS = [
  "10th Pass",
  "12th Pass",
  "Graduate",
  "Post Graduate",
  "Diploma / ITI",
  "Any Qualification",
];

export function PostJobModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isSubmittingRef = useRef(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      jobType: "private",
      type: "Full-time",
      experience: "Freshers",
      qualification: "Any Qualification",
      vacancies: "1",
      state: "Assam",
      applicationMethod: "whatsapp",
    },
  });

  const jobType = watch("jobType") || "private";
  const district = watch("district");
  const applicationMethod = watch("applicationMethod");

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const onSubmit = async (data: FormData) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      const payload = {
        ...data,
      };

      const result = await postJob({ data: payload as any });

      // Store in localStorage for payment-success backup retrieval
      localStorage.setItem(
        "jiwika_last_created_job",
        JSON.stringify({
          jobId: result.jobId,
          managementToken: result.managementToken,
          title: data.title,
          companyName: data.companyName,
          createdAt: new Date().toISOString(),
        }),
      );

      // Close modal, reset, and redirect to Cosmofeed / Success Page
      reset();
      onClose();

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    } catch (err: any) {
      console.error("Failed to post job:", err);
      let errMsg = err.message || "Failed to submit job. Please check all inputs.";
      if (err.info?.errors) {
        errMsg +=
          "\n" +
          err.info.errors
            .map((e: any) => `${e.path?.join(".") || "field"}: ${e.message}`)
            .join("\n");
      }
      alert(errMsg);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-card"
        >
          {/* Sticky header — stays pinned while the long form scrolls beneath it */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-4 py-3 sm:px-6 sm:py-4">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold">Post a Job</h2>
              <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                Reach thousands of local candidates. Post in minutes.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto w-full px-4 py-6 sm:px-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Job Type Selector */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-primary block mb-2.5">
                    Job Type *
                  </span>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Private Job Card */}
                    <div
                      onClick={() => setValue("jobType", "private")}
                      className={`relative flex cursor-pointer flex-col rounded-2xl border p-4 transition-all hover:shadow-md ${
                        jobType === "private"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold flex items-center gap-2 text-foreground">
                          <span className="text-lg">🏢</span> Private Job
                        </span>
                        {jobType === "private" && (
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
                      className={`relative flex cursor-pointer flex-col rounded-2xl border p-4 transition-all hover:shadow-md ${
                        jobType === "government"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold flex items-center gap-2 text-foreground">
                          <span className="text-lg">🏛</span> Government Job
                        </span>
                        {jobType === "government" && (
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

                {jobType === "private" ? (
                  <>
                    <Section title="Company Information">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        <Field label="Company Name *" error={errors.companyName?.message}>
                          <input
                            {...register("companyName", { required: "Required" })}
                            className="input"
                            placeholder="e.g. Acme Corporation"
                          />
                        </Field>
                        <Field label="HR Name *" error={errors.hrName?.message}>
                          <input
                            {...register("hrName", { required: "Required" })}
                            className="input"
                            placeholder="e.g. Rajesh Kumar"
                          />
                        </Field>
                        <Field label="HR Email Address *" error={errors.email?.message}>
                          <input
                            type="email"
                            {...register("email", { required: "Required" })}
                            className="input"
                            placeholder="e.g. hr@acme.com"
                          />
                        </Field>
                        <Field label="HR WhatsApp Number *" error={errors.whatsapp?.message}>
                          <input
                            {...register("whatsapp", { required: "Required" })}
                            className="input"
                            placeholder="e.g. 919876543210"
                          />
                        </Field>
                      </div>
                    </Section>

                    <Section title="Job Information">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        <Field label="Job Title *" error={errors.title?.message}>
                          <input
                            {...register("title", { required: "Required" })}
                            className="input"
                            placeholder="e.g. Supervisor, Delivery Executive"
                          />
                        </Field>

                        <Field label="Job Post *" error={errors.category?.message}>
                          <input
                            {...register("category", { required: "Required" })}
                            className="input"
                            placeholder="e.g. Sales Executive, Delivery Boy"
                          />
                        </Field>

                        <Field label="Salary Range" error={errors.salary?.message}>
                          <input
                            {...register("salary")}
                            className="input"
                            placeholder="e.g. ₹15-25k/mo or Negotiable"
                          />
                        </Field>

                        <Field label="Vacancies *" error={errors.vacancies?.message}>
                          <input
                            type="number"
                            min="1"
                            {...register("vacancies", { required: "Required" })}
                            className="input"
                            placeholder="e.g. 5"
                          />
                        </Field>

                        <Field label="Job Type *" error={errors.type?.message}>
                          <select {...register("type", { required: "Required" })} className="input">
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Internship">Internship</option>
                          </select>
                        </Field>

                        <Field label="Experience Required *" error={errors.experience?.message}>
                          <select
                            {...register("experience", { required: "Required" })}
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
                          error={errors.qualification?.message}
                        >
                          <select
                            {...register("qualification", { required: "Required" })}
                            className="input"
                          >
                            {QUALIFICATIONS.map((q) => (
                              <option key={q} value={q}>
                                {q}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="Application Deadline" error={errors.deadline?.message}>
                          <input type="date" {...register("deadline")} className="input" />
                        </Field>
                      </div>
                    </Section>

                    <Section title="Location Details">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        <Field label="Location / City *" error={errors.location?.message}>
                          <input
                            {...register("location", { required: "Required" })}
                            className="input"
                            placeholder="e.g. Jorhat Town, Silchar"
                          />
                        </Field>

                        <Field label="District *" error={errors.district?.message}>
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

                        <Field label="Address / Landmark" error={errors.address?.message}>
                          <input
                            {...register("address")}
                            className="input"
                            placeholder="e.g. Near Brahmaputra Bank, Ward 5"
                          />
                        </Field>
                      </div>
                    </Section>

                    <Section title="Details & Benefits">
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                        <Field label="Job Description">
                          <textarea
                            {...register("description")}
                            rows={3}
                            className="input resize-none"
                            placeholder="Describe the duties, requirements, and timing of the job."
                          />
                        </Field>
                        <Field label="Job Benefits">
                          <textarea
                            {...register("benefits")}
                            rows={2}
                            className="input resize-none"
                            placeholder="e.g. Free Meals, Travel Allowance, Accommodation"
                          />
                        </Field>
                      </div>
                    </Section>

                    <Section title="Application Method">
                      <p className="mb-3 text-xs text-muted-foreground ">
                        How should candidates apply?
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
                            className={`flex cursor-pointer items-center gap-1.5 sm:gap-2 rounded-xl border px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition ${
                              applicationMethod === opt.value
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
                              className={`h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full border-2 transition ${
                                applicationMethod === opt.value
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40"
                              }`}
                            >
                              {applicationMethod === opt.value && (
                                <span className="block h-full w-full scale-50 rounded-full bg-primary-foreground" />
                              )}
                            </span>
                            {opt.label}
                          </label>
                        ))}
                      </div>

                      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                        {(applicationMethod === "whatsapp" || applicationMethod === "both") && (
                          <Field
                            label="WhatsApp Number (for applications) *"
                            error={errors.applicationWhatsapp?.message}
                          >
                            <input
                              {...register("applicationWhatsapp", {
                                required:
                                  applicationMethod === "whatsapp" || applicationMethod === "both"
                                    ? "Required"
                                    : false,
                              })}
                              className="input"
                              placeholder="e.g. 919876543210"
                            />
                          </Field>
                        )}
                        {(applicationMethod === "email" || applicationMethod === "both") && (
                          <Field
                            label="Email Address (for applications) *"
                            error={errors.applicationEmail?.message}
                          >
                            <input
                              type="email"
                              {...register("applicationEmail", {
                                required:
                                  applicationMethod === "email" || applicationMethod === "both"
                                    ? "Required"
                                    : false,
                              })}
                              className="input"
                              placeholder="e.g. jobs@company.com"
                            />
                          </Field>
                        )}
                      </div>
                    </Section>
                  </>
                ) : (
                  <>
                    <Section title="Recruitment Details">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Recruitment Title *" error={errors.title?.message}>
                          <input
                            {...register("title", { required: "Required" })}
                            className="input"
                            placeholder="e.g. Sub-Inspector Recruitment 2026"
                          />
                        </Field>
                        <Field
                          label="Recruiting Organization *"
                          error={errors.companyName?.message}
                        >
                          <input
                            {...register("companyName", { required: "Required" })}
                            className="input"
                            placeholder="e.g. State Police Recruitment Board"
                          />
                        </Field>
                        <Field label="Department" error={errors.department?.message}>
                          <input
                            {...register("department")}
                            className="input"
                            placeholder="e.g. Home Department"
                          />
                        </Field>
                        <Field label="Official Website *" error={errors.officialWebsite?.message}>
                          <input
                            {...register("officialWebsite", { required: "Required" })}
                            className="input"
                            placeholder="e.g. https://assampolice.gov.in"
                          />
                        </Field>
                        <Field label="Application Deadline *" error={errors.deadline?.message}>
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

                {/* Submit Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pb-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-xl border border-border bg-background px-4 py-3 text-xs sm:text-sm font-medium hover:bg-muted w-full sm:flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-gradient-primary px-4 py-3 text-xs sm:text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-60 w-full sm:flex-1"
                  >
                    {isSubmitting ? "Submitting..." : "Post Job"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary border-b border-border/40 pb-1.5">
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
      <span className="text-xs font-medium text-foreground">
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
      <div className="mt-1">{children}</div>
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}
