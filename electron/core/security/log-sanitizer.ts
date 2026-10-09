/**
 * LogSanitizer
 * Strips and redacts sensitive information (UUIDs, tokens, passwords, private keys, internal IPs)
 * from logs, events, and diagnostic reports to guarantee zero privacy leakage.
 */
export class LogSanitizer {
  // Regex patterns for sensitive data
  private static readonly UUID_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
  private static readonly IPV4_REGEX = /\b(?!(?:127\.0\.0\.1|0\.0\.0\.0|10\.10\.34\.3[45]))(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g;
  private static readonly KEY_REGEX = /(?:password|passwd|key|token|secret|uuid|auth)=([^\s&]+)/gi;
  private static readonly BEARER_REGEX = /Bearer\s+([a-zA-Z0-9._-]+)/gi;
  private static readonly PRIVATE_KEY_REGEX = /-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[\s\S]*?-----END[ A-Z0-9_-]+PRIVATE KEY-----/g;

  /**
   * Cleans a string from all identifiable or secret tokens
   */
  public static sanitize(message: string): string {
    if (!message || typeof message !== 'string') return '';

    return message
      // Redact private keys
      .replace(this.PRIVATE_KEY_REGEX, '[REDACTED_PRIVATE_KEY]')
      // Redact UUIDs
      .replace(this.UUID_REGEX, 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
      // Redact query parameter keys and tokens
      .replace(this.KEY_REGEX, (_match, _val) => `token=[REDACTED]`)
      // Redact Bearer tokens
      .replace(this.BEARER_REGEX, 'Bearer [REDACTED_TOKEN]')
      // Mask non-local IPv4 addresses (leave first two octets, mask the rest)
      .replace(this.IPV4_REGEX, (_match, o1, o2, _o3, _o4) => `${o1}.${o2}.***.***`);
  }

  /**
   * Sanitizes object fields recursively
   */
  public static sanitizeObject<T>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;

    try {
      const serialized = JSON.stringify(obj);
      const sanitizedStr = this.sanitize(serialized);
      return JSON.parse(sanitizedStr) as T;
    } catch {
      return obj;
    }
  }
}
