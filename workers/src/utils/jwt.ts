/**
 * JWT utilities for token generation and verification
 * Uses Web Crypto API available in Cloudflare Workers
 */

import type { JWTPayload } from '../types';

/**
 * Base64url encode (without padding)
 */
function base64urlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64url decode
 */
function base64urlDecode(data: string): Uint8Array {
  // Add padding
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert string to Uint8Array
 */
function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Convert Uint8Array to string
 */
function uint8ArrayToString(arr: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(arr);
}

/**
 * Create HMAC signature using HS256
 */
async function createSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  const key = await crypto.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );

  return base64urlEncode(new Uint8Array(signature));
}

/**
 * Verify HMAC signature
 */
async function verifySignature(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = await createSignature(data, secret);

  // Constant-time comparison
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return mismatch === 0;
}

/**
 * Generate JWT token
 */
export async function generateToken(
  userId: string,
  email: string,
  secret: string,
  expiresIn: number = 86400 // 24 hours in seconds
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload: JWTPayload = {
    userId,
    email,
    iat: now,
    exp: now + expiresIn,
  };

  const encodedHeader = base64urlEncode(
    stringToUint8Array(JSON.stringify(header))
  );
  const encodedPayload = base64urlEncode(
    stringToUint8Array(JSON.stringify(payload))
  );

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signature = await createSignature(dataToSign, secret);

  return `${dataToSign}.${signature}`;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;
    const isValid = await verifySignature(dataToVerify, signature, secret);

    if (!isValid) {
      return null;
    }

    // Decode payload
    const payloadBytes = base64urlDecode(encodedPayload);
    const payloadStr = uint8ArrayToString(payloadBytes);
    const payload = JSON.parse(payloadStr) as JWTPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * Decode JWT token without verification (use with caution)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [, encodedPayload] = parts;
    const payloadBytes = base64urlDecode(encodedPayload);
    const payloadStr = uint8ArrayToString(payloadBytes);
    const payload = JSON.parse(payloadStr) as JWTPayload;

    return payload;
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(
  authHeader: string | null
): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Check if token is expired
 */
export function isTokenExpired(payload: JWTPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return payload.exp ? payload.exp < now : false;
}

/**
 * Get token expiration time in seconds
 */
export function getTokenExpiration(payload: JWTPayload): number {
  const now = Math.floor(Date.now() / 1000);
  return payload.exp ? Math.max(0, payload.exp - now) : 0;
}
