/**
 * API Utilities with Verification
 *
 * This module provides utility functions for making API calls
 * that automatically include Turnstile verification tokens.
 */

/**
 * Makes an API call with automatic verification token inclusion
 *
 * @param endpoint - API endpoint to call
 * @param options - Fetch options
 * @returns Promise resolving to fetch response
 */
export async function makeVerifiedApiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get verification token from session storage
  const verificationToken =
    typeof window !== "undefined"
      ? sessionStorage.getItem("turnstile_verification")
      : null;

  // Merge headers with verification token
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
    ...(verificationToken && { "X-Turnstile-Token": verificationToken }),
  };

  return fetch(endpoint, {
    ...options,
    headers,
  });
}

/**
 * Makes a verified POST request
 *
 * @param endpoint - API endpoint
 * @param data - Data to send in request body
 * @param options - Additional fetch options
 * @returns Promise resolving to fetch response
 */
export async function makeVerifiedPost(
  endpoint: string,
  data: any,
  options: RequestInit = {}
): Promise<Response> {
  return makeVerifiedApiCall(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * Makes a verified GET request
 *
 * @param endpoint - API endpoint
 * @param options - Additional fetch options
 * @returns Promise resolving to fetch response
 */
export async function makeVerifiedGet(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  return makeVerifiedApiCall(endpoint, {
    method: "GET",
    ...options,
  });
}
