/**
 * OpenNext's build configuration (ADR-0014).
 *
 * Deliberately almost empty. The adapter's documented starter wires an R2
 * incremental cache here, and we do not: R2 is `REQ-D.3` and lands in Cluster D.
 * `REQ-M.2` allows one capability per step, and this step is "the app runs on
 * Workers" — not "the app runs on Workers and caches to R2".
 *
 * Without an `incrementalCache` override, ISR and the full-route cache simply do
 * not persist between requests. Splitr renders every page per-request from the
 * session, so there is nothing to lose today. When R2 arrives, this is the file
 * that changes.
 */
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
