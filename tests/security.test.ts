import { describe, it, expect } from 'vitest';
import { CredentialVault } from '../electron/core/security/credential-vault';
import { LogSanitizer } from '../electron/core/security/log-sanitizer';

describe('Security & Privacy Protection Tests', () => {
  it('CredentialVault encrypts and decrypts sensitive passwords correctly', () => {
    const rawSecret = 'super_secret_vpn_password_123456!@#$';
    const encrypted = CredentialVault.encrypt(rawSecret);

    expect(encrypted).not.toBe(rawSecret);
    expect(encrypted.length).toBeGreaterThan(20);

    const decrypted = CredentialVault.decrypt(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it('LogSanitizer redacts UUIDs from logs', () => {
    const rawLog = 'Connected using client uuid: a68ef30f-2f83-4a57-b08e-8a16dbd78fa1 on port 443';
    const sanitized = LogSanitizer.sanitize(rawLog);

    expect(sanitized).not.toContain('a68ef30f-2f83-4a57-b08e-8a16dbd78fa1');
    expect(sanitized).toContain('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
  });

  it('LogSanitizer masks sensitive external IPv4 addresses', () => {
    const rawLog = 'Routing packet to remote edge server at 185.192.120.45:443';
    const sanitized = LogSanitizer.sanitize(rawLog);

    expect(sanitized).not.toContain('185.192.120.45');
    expect(sanitized).toContain('185.192.***.***');
  });

  it('LogSanitizer redacts authentication tokens and private keys', () => {
    const rawLog = 'Authorization header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz';
    const sanitized = LogSanitizer.sanitize(rawLog);

    expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz');
    expect(sanitized).toContain('Bearer [REDACTED_TOKEN]');
  });
});
