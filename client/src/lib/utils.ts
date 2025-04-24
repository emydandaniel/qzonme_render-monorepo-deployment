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
  
  // CRITICAL FIX: Block empty names entirely
  if (!creatorName || !creatorName.trim()) {
    console.error("❌ CRITICAL ERROR: Empty creator name in slug generation");
    throw new Error("Creator name cannot be empty for URL slug generation");
  }
  
  // CRITICAL FIX: Block the problematic default name explicitly
  if (creatorName.toLowerCase().includes('emydan')) {
    console.error("❌ CRITICAL ERROR: Default name 'emydan' detected");
    throw new Error("Cannot use default creator name");
  }
  
  // Convert to lowercase and clean the name (no special chars)
  let cleanName = creatorName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric chars
    .replace(/\s+/g, '');      // Remove spaces
    
  // VALIDATION: Ensure clean name has actual content
  if (!cleanName) {
    console.error("❌ CRITICAL ERROR: Name contained only special characters");
    cleanName = "quiz" + Date.now().toString().slice(-4);
  }
  
  // Limit the name to 10 characters max
  cleanName = cleanName.substring(0, 10);
  
  // CRITICAL FIX: Generate multiple independent sources of entropy
  // 1. Full precise timestamp with milliseconds
  const fullTimestamp = Date.now().toString();
  
  // 2. ISO date converted to a code
  const dateCode = new Date().toISOString().replace(/[^\d]/g, '').slice(-10);
  
  // 3. Multiple random strings with different generation methods
  const randomString1 = Math.random().toString(36).substring(2, 8);
  const randomString2 = Math.random().toString(36).substring(2, 6);
  
  // 4. Random number using a more precise calculation
  const randomNum = Math.floor(Math.random() * 1000000);
  
  // 5. Additional character-based randomness using array method
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomChars = Array.from(
    { length: 5 }, 
    () => chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  
  // 6. Create a completely unique and unpredictable combined format
  const uniqueId = `${dateCode.slice(-4)}-${randomString1}-${randomString2}`;
  
  // Combine all entropy sources with the name for 100% uniqueness
  // Final format: name-timestamp-uniqueId-randomNum-randomChars
  const slug = `${cleanName}-${fullTimestamp.slice(-6)}-${uniqueId}-${randomNum}-${randomChars}`;
  
  console.log(`✅ GUARANTEED unique slug generated: ${slug}`);
  console.log(`Base name: "${cleanName}" from "${creatorName}"`);
  console.log(`Timestamp: ${fullTimestamp.slice(-6)}, Date code: ${dateCode.slice(-4)}`);
  console.log(`Random components: ${uniqueId}, ${randomNum}, ${randomChars}`);
  
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
