import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Job } from "../mock-data";

const API_BASE = (() => {
  const url =
    typeof process !== "undefined" && process.env ? process.env.API_BASE_URL : undefined;
  if (!url) {
    // In development, fall back to localhost. In production, this MUST be set.
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
      throw new Error("API_BASE_URL environment variable is required in production");
    }
    return "http://localhost:3000/api";
  }
  return url;
})();

// Helper to make API calls
async function callApi<T>(endpoint: string, method: string, body?: any): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const detailMsg = err.details
      ? `: ${err.details.map((d: any) => `${d.field}: ${d.message}`).join(", ")}`
      : "";
    throw new Error((err.error || `HTTP error! status: ${response.status}`) + detailMsg);
  }

  return response.json();
}

// Zod validation schemas
const privateJobSchema = z.object({
  jobType: z.literal("private").optional().default("private"),
  companyName: z.string().min(1),
  hrName: z.string().min(1),
  email: z.string().email(),
  whatsapp: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  salary: z.string().optional(),
  experience: z.string().min(1),
  qualification: z.string().min(1),
  vacancies: z.string().min(1),
  type: z.enum(["Full-time", "Part-time", "Internship"]),
  state: z.string().min(1),
  district: z.string().min(1),
  location: z.string().min(1),
  address: z.string().optional(),
  description: z.string().optional(),
  benefits: z.string().optional(),
  deadline: z.string().optional(),
  logo: z.string().optional(),
  applicationMethod: z.enum(["whatsapp", "email", "both"]),
  applicationWhatsapp: z.string().optional(),
  applicationEmail: z.string().optional(),
});

const governmentJobSchema = z.object({
  jobType: z.literal("government"),
  title: z.string().min(1),
  companyName: z.string().min(1),
  department: z.string().optional(),
  officialWebsite: z.string().min(1),
  logo: z.string().optional(),
  deadline: z.string().optional(),
});

export function isJobExpired(j: Job): boolean {
  if (j.expired || j.status === "expired") return true;
  if (
    j.deadline &&
    j.deadline !== "See Notice" &&
    j.deadline !== "See Details" &&
    j.deadline !== "See Notice/Notice Board" &&
    j.deadline !== "See Notice Board"
  ) {
    const d = Date.parse(j.deadline);
    if (!isNaN(d)) {
      const deadlineDate = new Date(d);
      deadlineDate.setHours(23, 59, 59, 999);
      return deadlineDate < new Date();
    }
  }
  return false;
}

// ── GET JOBS NEARBY ──
export const getJobsNearby = createServerFn({ method: "POST" })
  .validator(
    z.object({
      lat: z.number(),
      lng: z.number(),
      keyword: z.string().optional(),
      jobType: z.enum(["all", "private", "government"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ jobs: Job[] }>("/jobs/nearby", "POST", data);
  });

// ── GET JOBS EVERYWHERE ──
export const getJobsEverywhere = createServerFn({ method: "POST" })
  .validator(
    z.object({
      district: z.string().optional(),
      location: z.string().optional(),
      keyword: z.string().optional(),
      jobType: z.enum(["all", "private", "government", "results"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ jobs: Job[] }>("/jobs/everywhere", "POST", data);
  });

// ── POST A JOB ──
export const postJob = createServerFn({ method: "POST" })
  .validator(z.union([privateJobSchema, governmentJobSchema]))
  .handler(async ({ data }) => {
    return callApi<{ jobId: string; managementToken: string; redirectUrl: string }>(
      "/jobs",
      "POST",
      data,
    );
  });

// ── GET JOB BY TOKEN (Employer) ──
export const getJobByToken = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(6) }))
  .handler(async ({ data }) => {
    return callApi<{ job: Job }>("/employer/job", "POST", { token: data.token });
  });

// ── UPDATE JOB BY TOKEN (Employer) ──
export const updateJobByToken = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(6),
      data: z.union([privateJobSchema, governmentJobSchema]),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ success: boolean }>("/employer/job", "PUT", data);
  });

// ── DELETE JOB BY TOKEN (Employer) ──
export const deleteJobByToken = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(6) }))
  .handler(async ({ data }) => {
    return callApi<{ success: boolean }>("/employer/job", "DELETE", { token: data.token });
  });

// ── PAUSE / RESUME JOB BY TOKEN (Employer) ──
export const pauseJobByToken = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(6),
      paused: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ success: boolean; paused: boolean }>("/employer/job/pause", "POST", data);
  });

// ── RENEW JOB BY TOKEN (Employer) ──
export const renewJobByToken = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(6) }))
  .handler(async ({ data }) => {
    return callApi<{ success: boolean; renewCount: number }>("/employer/job/renew", "POST", {
      token: data.token,
    });
  });

// ── GET ALL JOBS FOR ADMIN PANEL ──
export const getAdminJobs = createServerFn({ method: "POST" })
  .validator(
    z.object({
      password: z.string(),
      statusFilter: z.enum([
        "all",
        "pending_payment",
        "pending",
        "active",
        "rejected",
        "expired",
        "deleted",
        "post_results",
      ]),
      searchQuery: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ jobs: Job[] }>("/admin/jobs", "POST", data);
  });

// ── GET PENDING JOBS (Admin - Deprecated / Backward Compatibility) ──
export const getPendingJobs = createServerFn({ method: "POST" })
  .validator(
    z.object({
      password: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ jobs: Job[] }>("/admin/jobs", "POST", {
      password: data.password,
      statusFilter: "pending",
    });
  });

// ── VERIFY PAYMENT (Admin) ──
export const adminVerifyPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      password: z.string(),
      jobId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ success: boolean }>("/admin/verify-payment", "POST", data);
  });

// ── APPROVE JOB (Admin) ──
export const approveJob = createServerFn({ method: "POST" })
  .validator(
    z.object({
      password: z.string(),
      jobId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ success: boolean }>("/admin/approve", "POST", data);
  });

// ── REJECT JOB (Admin) ──
export const rejectJob = createServerFn({ method: "POST" })
  .validator(
    z.object({
      password: z.string(),
      jobId: z.string(),
      reason: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ success: boolean }>("/admin/reject", "POST", data);
  });

// ── PAUSE / RESUME JOB (Admin) ──
export const adminPauseJob = createServerFn({ method: "POST" })
  .validator(
    z.object({
      password: z.string(),
      jobId: z.string(),
      paused: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ success: boolean }>("/admin/pause", "POST", data);
  });

// ── EXPIRE JOB (Admin) ──
export const adminExpireJob = createServerFn({ method: "POST" })
  .validator(
    z.object({
      password: z.string(),
      jobId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ success: boolean }>("/admin/expire", "POST", data);
  });

// ── RESTORE JOB (Admin) ──
export const adminRestoreJob = createServerFn({ method: "POST" })
  .validator(
    z.object({
      password: z.string(),
      jobId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ success: boolean }>("/admin/restore", "POST", data);
  });

// ── DELETE JOB (Admin - Soft Delete) ──
export const adminDeleteJob = createServerFn({ method: "POST" })
  .validator(
    z.object({
      password: z.string(),
      jobId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ success: boolean }>("/admin/delete", "POST", data);
  });

// ── POST RESULT (Admin) ──
export const adminPostResult = createServerFn({ method: "POST" })
  .validator(
    z.object({
      password: z.string(),
      title: z.string().min(1),
      companyName: z.string().min(1),
      department: z.string().optional(),
      officialWebsite: z.string().min(1),
      deadline: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ success: boolean; jobId: string; message: string }>(
      "/admin/post-result",
      "POST",
      data,
    );
  });

// ── EDIT RESULT (Admin) ──
export const adminEditResult = createServerFn({ method: "POST" })
  .validator(
    z.object({
      password: z.string(),
      jobId: z.string(),
      title: z.string().min(1),
      companyName: z.string().min(1),
      department: z.string().optional(),
      officialWebsite: z.string().min(1),
      deadline: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ success: boolean; message: string }>("/admin/edit-result", "POST", data);
  });

// ── GET PAYMENT SETTINGS ──
export const getPaymentSetting = createServerFn({ method: "GET" }).handler(async () => {
  return callApi<{ paymentsEnabled: boolean; upiId: string; amount: number; qrCodeImage?: string }>(
    "/jobs/payment-setting",
    "GET",
  );
});

// ── SUBMIT JOB PAYMENT ──
export const submitJobPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      jobId: z.string().min(1),
      token: z.string().min(1),
      upiTxnId: z.string().regex(/^\d{12}$/),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ success: boolean; message: string }>("/jobs/submit-payment", "POST", data);
  });

// ── GET ADMIN SETTINGS ──
export const getAdminSettings = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string() }))
  .handler(async ({ data }) => {
    return callApi<{
      settings: { paymentsEnabled: boolean; upiId: string; amount: number; qrCodeImage?: string };
    }>("/admin/get-settings", "POST", data);
  });

// ── UPDATE ADMIN SETTINGS ──
export const updateAdminSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      password: z.string(),
      paymentsEnabled: z.boolean(),
      upiId: z.string().min(1),
      amount: z.number().min(0),
      qrCodeImage: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return callApi<{ success: boolean; settings: any }>("/admin/update-settings", "POST", data);
  });
