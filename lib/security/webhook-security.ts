// In-memory sliding window rate limiter
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

/**
 * Validate webhook target URL to enforce HTTPS and prevent SSRF attacks on private networks
 */
export function validateWebhookUrl(urlString: string): { valid: boolean; error?: string } {
  if (!urlString || typeof urlString !== "string") {
    return { valid: false, error: "Webhook URL is required." };
  }

  try {
    const parsed = new URL(urlString);

    // Enforce HTTPS unless explicitly enabled in local dev
    const allowHttp = process.env.ALLOW_HTTP_WEBHOOKS === "true" || process.env.NODE_ENV === "test";
    if (parsed.protocol !== "https:" && !allowHttp) {
      return { valid: false, error: "Webhook URL must use HTTPS protocol." };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block private & loopback addresses (SSRF Protection)
    const privateHostnames = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "169.254.169.254"];
    if (privateHostnames.includes(hostname) && !allowHttp) {
      return { valid: false, error: "Internal or loopback URLs are blocked for security." };
    }

    // Check IPv4 private subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16)
    if (!allowHttp) {
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const match = hostname.match(ipv4Regex);
      if (match) {
        const [, p1, p2] = match.map(Number);
        if (
          p1 === 10 ||
          (p1 === 172 && p2 >= 16 && p2 <= 31) ||
          (p1 === 192 && p2 === 168) ||
          (p1 === 169 && p2 === 254)
        ) {
          return { valid: false, error: "Private IP address ranges are prohibited." };
        }
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid Webhook URL syntax." };
  }
}

/**
 * Sliding window rate-limiter
 * Returns { allowed: true } or { allowed: false, remainingMs: number }
 */
export function checkRateLimit(
  workspaceId: string,
  actionKey: string,
  limit: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remainingMs?: number } {
  const key = `${workspaceId}:${actionKey}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.expiresAt) {
    rateLimitMap.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return { allowed: false, remainingMs: entry.expiresAt - now };
  }

  entry.count += 1;
  return { allowed: true };
}

/**
 * Validate Vercel Cron authorization header
 */
export function validateCronSecret(request: Request): boolean {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    // In local development or if CRON_SECRET is omitted, log warning and allow
    if (process.env.NODE_ENV === "development") return true;
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");

  if (authHeader && authHeader.replace(/^Bearer\s+/i, "") === expectedSecret) {
    return true;
  }

  if (cronHeader && cronHeader === expectedSecret) {
    return true;
  }

  return false;
}
