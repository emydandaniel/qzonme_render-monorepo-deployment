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
