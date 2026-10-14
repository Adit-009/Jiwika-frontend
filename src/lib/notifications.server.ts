import type { Job } from "./mock-data";

export async function sendJobNotification(
  job: Job,
  type: "created" | "approved" | "rejected" | "updated",
) {
  // Console logging removed.
}
