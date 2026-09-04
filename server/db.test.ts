import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, encrypt, decrypt, sanitizeForFirestore } from './db';

describe('hashPassword / verifyPassword', () => {
  it('verifies a correct password against its own hash', () => {
    const hash = hashPassword('Correct-Horse-42!');
    expect(verifyPassword('Correct-Horse-42!', hash)).toBe(true);
  });

  it('rejects an incorrect password', () => {
    const hash = hashPassword('Correct-Horse-42!');
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('produces a different salt (and hash) each time for the same password', () => {
    const a = hashPassword('same-password');
    const b = hashPassword('same-password');
    expect(a).not.toBe(b);
    expect(verifyPassword('same-password', a)).toBe(true);
    expect(verifyPassword('same-password', b)).toBe(true);
  });

  it('rejects when the password or hash is empty', () => {
    expect(verifyPassword('', hashPassword('x'))).toBe(false);
    expect(verifyPassword('x', '')).toBe(false);
  });

  it('does not throw on a malformed stored hash', () => {
    expect(() => verifyPassword('anything', 'not-a-real-hash')).not.toThrow();
    expect(verifyPassword('anything', 'not-a-real-hash')).toBe(false);
  });
});

describe('encrypt / decrypt', () => {
  it('round-trips plaintext through encryption', () => {
    const plaintext = '+27 82 555 0199';
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.startsWith('gcm:')).toBe(true);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it('produces a different ciphertext each time (random IV) for the same input', () => {
    const a = encrypt('same input');
    const b = encrypt('same input');
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe('same input');
    expect(decrypt(b)).toBe('same input');
  });

  it('returns an empty string unchanged rather than encrypting it', () => {
    expect(encrypt('')).toBe('');
  });

  it('does not throw on ciphertext that has been tampered with', () => {
    const encrypted = encrypt('sensitive id number');
    const tampered = encrypted.slice(0, -4) + '0000';
    expect(() => decrypt(tampered)).not.toThrow();
  });
});

describe('sanitizeForFirestore', () => {
  it('replaces undefined with null (Firestore rejects undefined)', () => {
    expect(sanitizeForFirestore(undefined)).toBe(null);
    expect(sanitizeForFirestore({ a: undefined, b: 1 })).toEqual({ a: null, b: 1 });
  });

  it('recurses into nested objects and arrays', () => {
    const input = { a: [{ b: undefined, c: 2 }], d: { e: undefined } };
    expect(sanitizeForFirestore(input)).toEqual({ a: [{ b: null, c: 2 }], d: { e: null } });
  });

  it('converts Date instances to ISO strings', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    expect(sanitizeForFirestore(date)).toBe('2026-01-01T00:00:00.000Z');
  });

  it('leaves primitives and null untouched', () => {
    expect(sanitizeForFirestore(null)).toBe(null);
    expect(sanitizeForFirestore(42)).toBe(42);
    expect(sanitizeForFirestore('text')).toBe('text');
    expect(sanitizeForFirestore(true)).toBe(true);
  });
});
