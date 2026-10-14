import { JOBS } from "./mock-data";
import type { Job } from "./mock-data";

// ── In-memory data store (server-only, resets on restart) ──

export const jobsStore = new Map<string, Job>();
JOBS.forEach((job) => jobsStore.set(job.id, { jobType: "private", ...job }));

let jobIdCounter = JOBS.length;

// ── Helpers ──

export function generateJobId(): string {
  jobIdCounter++;
  return String(jobIdCounter);
}

export function generateFormattedJobId(idStr: string): string {
  const padded = idStr.padStart(6, "0");
  return `JIV-2026-${padded}`;
}

export function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 36; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// ── Admin auth ──

const ADMIN_PASSWORD =
  typeof process !== "undefined" && process.env ? process.env.ADMIN_PASSWORD : null;

export function validateAdmin(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

/** Haversine distance in km */
export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
