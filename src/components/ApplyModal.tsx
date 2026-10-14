import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { X, MessageCircle, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import type { Job } from "@/lib/mock-data";

type FormData = { name: string; mobile: string; email: string };

type Step = "form" | "method";

export function ApplyModal({ job, onClose }: { job: Job | null; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>();

  const [step, setStep] = useState<Step>("form");
  const [formData, setFormData] = useState<FormData | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (job) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [job]);

  const handleClose = () => {
    setStep("form");
    setFormData(null);
    reset();
    onClose();
  };

  const onSubmit = (data: FormData) => {
    if (!job) return;

    if (job.applicationMethod === "whatsapp") {
      openWhatsApp(job, data);
      handleClose();
    } else if (job.applicationMethod === "email") {
      openEmail(job, data);
      handleClose();
    } else {
      // "both" — let user choose
      setFormData(data);
      setStep("method");
    }
  };

  const openWhatsApp = (j: Job, data: FormData) => {
    const msg = encodeURIComponent(
      `Hello,\n\nI am interested in this position.\n\nName: ${data.name}\nPhone: ${data.mobile}\n\nThank you.`,
    );
    const number = j.whatsappNumber || "";
    window.open(`https://wa.me/${number}?text=${msg}`, "_blank");
  };

  const openEmail = (j: Job, data: FormData) => {
    const to = j.contactEmail || "";
    const subject = encodeURIComponent(`Application for ${j.title}`);
    const body = encodeURIComponent(
      `Hello,\n\nI would like to apply for the ${j.title} position.\n\nName: ${data.name}\nPhone: ${data.mobile}\nEmail: ${data.email}\n\nResume attached.\n\nThank you.`,
    );
    window.open(
      `https://mail.google.com/mail/?view=cm&to=${to}&su=${subject}&body=${body}`,
      "_blank",
    );
  };

  return (
    <AnimatePresence>
      {job && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center max-lg:landscape:items-stretch"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 240 }}
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar rounded-t-3xl bg-card p-4 sm:p-6 shadow-float sm:rounded-3xl sm:max-h-[80vh] max-lg:landscape:w-full max-lg:landscape:h-screen max-lg:landscape:max-h-screen max-lg:landscape:rounded-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted z-10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="max-w-md mx-auto w-full">
              {/* Step 1: Application Form */}
              {step === "form" && (
                <>
                  <h2 className="text-lg sm:text-xl font-bold">Apply for this job</h2>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{job.title}</span> · {job.company}
                  </p>
                  {job.deadline && (
                    <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      {job.jobType === "government"
                        ? "Last Date to Apply: "
                        : "Application Deadline: "}
                      {isNaN(Date.parse(job.deadline))
                        ? job.deadline
                        : new Date(job.deadline).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                    </p>
                  )}

                  <div className="mt-3.5 rounded-xl bg-primary/5 border border-primary/10 p-3 text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p>
                      <strong>Note:</strong> After clicking <strong>Continue</strong>,{" "}
                      {job.applicationMethod === "whatsapp" && (
                        <>
                          you will be redirected to <strong>WhatsApp</strong> with your form data
                          filled in. Please remember to <strong>attach your resume</strong> along
                          with this.
                        </>
                      )}
                      {job.applicationMethod === "email" && (
                        <>
                          you will be redirected to <strong>Email</strong> with your form data
                          filled in. Please remember to <strong>attach your resume</strong> there.
                        </>
                      )}
                      {job.applicationMethod === "both" && (
                        <>
                          you will choose to redirect to <strong>WhatsApp or Email</strong> with
                          your form data filled in. Please remember to{" "}
                          <strong>attach your resume</strong> once redirected.
                        </>
                      )}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
                    <Field label="Full Name *" error={errors.name?.message}>
                      <input
                        {...register("name", { required: "Required" })}
                        className="input"
                        placeholder="Your name"
                      />
                    </Field>
                    <Field label="Mobile Number *" error={errors.mobile?.message}>
                      <input
                        {...register("mobile", {
                          required: "Required",
                          pattern: {
                            value: /^\d{10}$/,
                            message: "10-digit mobile",
                          },
                        })}
                        className="input"
                        placeholder="9876543210"
                      />
                    </Field>
                    <Field label="Email *" error={errors.email?.message}>
                      <input
                        type="email"
                        {...register("email", { required: "Required" })}
                        className="input"
                        placeholder="you@email.com"
                      />
                    </Field>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-xl border border-border bg-background px-4 py-3 text-xs sm:text-sm font-medium hover:bg-muted w-full sm:flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-xs sm:text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 w-full sm:flex-1"
                      >
                        <ArrowRight className="h-4 w-4" />
                        Continue
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* Step 2: Choose Application Method (only for "both") */}
              {step === "method" && formData && (
                <div className="py-2">
                  <div className="flex flex-col items-center text-center">
                    <h2 className="text-xl font-bold">Choose How to Apply</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choose one of the methods below to send your details to the recruiter.
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <button
                      onClick={() => {
                        openWhatsApp(job, formData);
                        handleClose();
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-success px-4 py-3.5 text-sm font-semibold text-success-foreground shadow-soft transition hover:opacity-90"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Apply via WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        openEmail(job, formData);
                        handleClose();
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3.5 text-sm font-semibold text-destructive-foreground shadow-soft transition hover:opacity-90"
                    >
                      <Mail className="h-4 w-4" />
                      Apply via Email
                    </button>
                  </div>

                  <button
                    onClick={handleClose}
                    className="mt-6 w-full text-center text-xs text-muted-foreground hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
