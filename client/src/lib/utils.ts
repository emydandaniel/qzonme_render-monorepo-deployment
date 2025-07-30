import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercentage(score: number, total: number): string {
  if (total <= 0) return "0%";
  
  // Ensure score doesn't exceed total
  const validScore = Math.min(score, total);
  
  // Calculate percentage with the valid score
  return Math.round((validScore / total) * 100) + "%";
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
  // No-op function - ads disabled for now
  // When ad networks are approved, this can be re-implemented
}

export function generateUrlSlug(creatorName: string): string {
  console.log(`➡️ Generating URL slug for: "${creatorName}"`);
  console.log(`➡️ Creator name type: ${typeof creatorName}`);
  console.log(`➡️ Creator name length: ${creatorName?.length || 'N/A'}`);
  
  // CRITICAL FIX: Block empty names entirely
  if (!creatorName || !creatorName.trim()) {
    console.error("❌ CRITICAL ERROR: Empty creator name in slug generation");
    console.error("❌ creatorName value:", creatorName);
    console.error("❌ creatorName type:", typeof creatorName);
    throw new Error("Creator name cannot be empty for URL slug generation");
  }
  
  // Convert to lowercase and clean the name (no special chars)
  let cleanName = creatorName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric chars
    .replace(/\s+/g, '');      // Remove spaces
    
  console.log(`➡️ Clean name after processing: "${cleanName}"`);
  
  // VALIDATION: Ensure clean name has actual content
  if (!cleanName) {
    console.error("❌ CRITICAL ERROR: Name contained only special characters");
    cleanName = "quiz" + Date.now().toString().slice(-4);
    console.log(`➡️ Using fallback name: "${cleanName}"`);
  }
  
  // Limit the name to max 15 characters
  cleanName = cleanName.substring(0, 15);
  
  // Generate a short random code (4 characters)
  const randomString = Math.random().toString(36).substring(2, 6);
  
  // Generate a short numeric code
  const numericCode = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  // Combine for a shorter, more trustworthy slug
  const slug = `${cleanName}-${randomString}${numericCode}`;
  
  console.log(`✅ Created shortened slug: ${slug}`);
  
  return slug;
}

// Generate a secure dashboard token (UUID format)
export function generateDashboardToken(): string {
  // Create a reasonably secure token without dependencies
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

export function getRemarkByScore(score: number, total: number): string {
  if (total <= 0) return "Perfect score! You're absolutely amazing! 🧠❤️";
  
  // Ensure score doesn't exceed total
  const validScore = Math.min(score, total);
  
  // Calculate percentage with the valid score
  const percentage = (validScore / total) * 100;
  
  if (percentage <= 20) {
    return "Don't worry, practice makes perfect! 😅";
  } else if (percentage <= 40) {
    return "Good effort! Keep learning 🤔";
  } else if (percentage <= 60) {
    return "Not bad! You're doing well 👀";
  } else if (percentage <= 80) {
    return "Great job! You really know your stuff! 🔥🔥";
  } else {
    return "Perfect score! You're absolutely amazing! 🧠❤️";
  }
}
