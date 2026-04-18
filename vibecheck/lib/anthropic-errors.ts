/** Normalize Anthropic SDK / HTTP errors for safe UI copy (no secrets). */

export function friendlyAnthropicMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes("invalid x-api-key") ||
    lower.includes("authentication_error") ||
    lower.includes("401")
  ) {
    return "Invalid API key. In vibecheck/.env.local set ANTHROPIC_API_KEY=your sk-ant-… key from console.anthropic.com — save the file, then restart npm run dev.";
  }
  if (lower.includes("credit") || lower.includes("billing")) {
    return "Anthropic rejected the request (billing/credits). Check your Anthropic account usage and billing.";
  }
  if (lower.includes("model") && lower.includes("not found")) {
    return "Model not found. Try setting ANTHROPIC_MODEL in .env.local to a model your key can access (see Anthropic docs).";
  }
  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}

export function isLikelyInvalidKey(key: string): boolean {
  const k = key.trim();
  if (k.length < 20) return true;
  const bad = /paste|your.?key|example|changeme|xxx/i;
  return bad.test(k);
}
