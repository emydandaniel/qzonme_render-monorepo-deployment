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
  console.log(`➡️ Generating FRESH URL SLUG for name: "${creatorName}"`);
  
  // Defensive programming - if empty name somehow passed, use "quiz"
  if (!creatorName || !creatorName.trim()) {
    creatorName = "quiz" + Math.random().toString(36).substring(2, 6);
    console.warn("⚠️ Empty creator name provided, using fallback:", creatorName);
  }
  
  // Convert to lowercase and clean the name (no special chars)
  let cleanName = creatorName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric chars
    
  // Limit the name to 10 characters max
  cleanName = cleanName.substring(0, 10);
  
  // Add extensive randomness to ensure absolute uniqueness
  // Generate multiple random elements combined:
  const timestamp = Date.now().toString(); // Full timestamp
  const randomString1 = Math.random().toString(36).substring(2, 8); // 6 chars
  const randomString2 = Math.random().toString(36).substring(2, 8); // 6 more chars
  const randomNum = Math.floor(Math.random() * 10000); // Random 0-9999
  
  // Get another random character set with different algorithm
  const randomChars = Array.from({length: 4}, () => 
    'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(
      Math.floor(Math.random() * 36)
    )
  ).join('');
  
  // Combine name + full timestamp + multiple random elements for guaranteed uniqueness
  // Format: name-timestamp-randomString-randomNum-randomChars
  const slug = `${cleanName}-${timestamp.slice(-6)}-${randomString1}-${randomNum}-${randomChars}`;
  
  console.log(`✅ Generated absolutely unique slug: ${slug}`);
  console.log(`Timestamp component: ${timestamp.slice(-6)}`);
  console.log(`Random components: ${randomString1}, ${randomNum}, ${randomChars}`);
  
  return slug;
}

// Generate a secure dashboard token (UUID format)
export function generateDashboardToken(): string {
  // Create a reasonably secure token without dependencies
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
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
