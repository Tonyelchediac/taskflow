/**
 * auth.js — JWT authentication utility for TaskFlow
 *
 * All token operations and authenticated fetch go through here so the
 * rest of the app never touches localStorage directly.
 */

const TOKEN_KEY = "taskflow_token";

/** Store a JWT in localStorage */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Retrieve the stored JWT (or null) */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/** Remove the stored JWT (logout) */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Decode the JWT payload without verifying the signature.
 * Verification happens on the server; we just need the claims for UI.
 * Returns the payload object or null if no/invalid token.
 */
export function getUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload; // { userID, status, iat, exp }
  } catch {
    return null;
  }
}

/**
 * Returns true if a token exists AND has not yet expired.
 */
export function isAuthenticated() {
  const user = getUser();
  if (!user) return false;
  // exp is in seconds; Date.now() is in ms
  return user.exp * 1000 > Date.now();
}

/**
 * Authenticated fetch — automatically attaches the Bearer token header.
 * Use this in place of plain fetch() for all protected API calls.
 *
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<Response>}
 */
export async function authFetch(url, options = {}) {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
