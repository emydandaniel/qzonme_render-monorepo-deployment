import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercentage(score: number, total: number): string {
  if (total === 0) return "0%";
  return Math.round((score / total) * 100) + "%";
}

export function createAvatarPlaceholder(name: string): string {
  if (!name) return '';
  const nameParts = name.split(' ');
  if (nameParts.length === 1) {
    return name.substring(0, 2).toUpperCase();
  }
  return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
}

export function generateAccessCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function showAdInterstitial() {
  console.log("Ad Trigger: Show Interstitial Ad");
  // Implementation would connect to Adsterra SDK
}

export function generateUrlSlug(creatorName: string): string {
  // Convert to lowercase and clean the name (no special chars)
  let cleanName = creatorName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric chars
    
  // Limit the name to 10 characters max
  cleanName = cleanName.substring(0, 10);
  
  // Create a truly unique suffix by combining:
  // 1. Current timestamp (as hex) - provides time-based uniqueness
  const timestamp = Date.now().toString(16);
  
  // 2. Random UUID-like string (8 characters) - adds randomness
  const randomChars = Math.random().toString(36).substring(2, 10);
  
  // 3. Add a unique nonce (random number) for extra entropy
  const nonce = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  // Combine all elements to create a truly unique slug
  return `${cleanName}-${timestamp}${randomChars.substring(0, 4)}`;
}

export function getRemarkByScore(score: number, total: number): string {
  const percentage = total === 0 ? 0 : (score / total) * 100;
  
  if (percentage <= 20) {
    return "Oops! You don't know me at all 😅";
  } else if (percentage <= 40) {
    return "Hmm… you kinda know me 🤔";
  } else if (percentage <= 60) {
    return "Not bad! You're getting there 👀";
  } else if (percentage <= 80) {
    return "Yoo you really know me! 🔥🔥";
  } else {
    return "Perfect! You're basically my twin 🧠❤️";
  }
}
