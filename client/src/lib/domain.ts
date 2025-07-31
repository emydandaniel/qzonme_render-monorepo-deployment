/**
 * Domain and URL utilities for QzonMe
 * Handles both local development and production environments
 */

/**
 * Get the base URL for the current environment
 * - In production/hosted environment: uses https://qzonme.com
 * - In development: uses current window location
 */
export function getBaseUrl(): string {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return 'https://qzonme.com'; // Fallback for SSR
  }

  const currentHost = window.location.host;
  const currentProtocol = window.location.protocol;
  
  // If we're on localhost or any development domain, use current location
  if (currentHost.includes('localhost') || 
      currentHost.includes('127.0.0.1') || 
      currentHost.includes('0.0.0.0') ||
      currentHost.includes('.repl.co') ||
      currentHost.includes('replit.dev') ||
      currentHost.endsWith('.dev') ||
      currentHost.includes(':')) {
    
    console.log(`🔧 Development environment detected: ${currentProtocol}//${currentHost}`);
    return `${currentProtocol}//${currentHost}`;
  }
  
  // For production or custom domains, use the configured domain
  console.log(`🌐 Production environment detected, using: https://qzonme.com`);
  return 'https://qzonme.com';
}

/**
 * Generate a shareable quiz URL
 */
export function getQuizUrl(urlSlug: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/quiz/${urlSlug}`;
}

/**
 * Generate a dashboard URL
 */
export function getDashboardUrl(dashboardToken: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/dashboard/${dashboardToken}`;
}

/**
 * Get a shareable message for the quiz
 */
export function getShareMessage(urlSlug: string, creatorName?: string): string {
  const quizUrl = getQuizUrl(urlSlug);
  
  if (creatorName) {
    return `Hey! ${creatorName} created this quiz for you 🧠\nFrom friendship tests to trivia challenges - see how well you score! 🏆\n${quizUrl}`;
  } else {
    return `Hey! I created this quiz on QzonMe 🧠\nFrom friendship tests to trivia challenges - see how well you score! 🏆\n${quizUrl}`;
  }
}
