import axios from 'axios';
import * as cheerio from 'cheerio';
import { google } from 'googleapis';
import { AUTO_CREATE_SERVER_CONFIG } from '../config/autoCreate';
import { db } from '../db';
import { contentCache, insertContentCacheSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export interface ContentExtractionResult {
  success: boolean;
  content: string;
  contentType: 'web' | 'youtube' | 'document';
  quality: number; // 1-10 scale
  metadata: {
    title?: string;
    url?: string;
    wordCount: number;
    extractionTime: number;
    cached: boolean;
    error?: string;
  };
}

export interface YouTubeTranscriptResult {
  success: boolean;
  transcript: string;
  metadata: {
    title: string;
    duration: string;
    videoId: string;
    language: string;
    wordCount: number;
  };
}

/**
 * Extract content from web pages using web scraping
 */
export async function extractWebContent(url: string): Promise<ContentExtractionResult> {
  const startTime = Date.now();
  
  try {
    // Check cache first
    const contentHash = crypto.createHash('md5').update(url).digest('hex');
    const cached = await getCachedContent(contentHash);
    
    if (cached) {
      return {
        success: true,
        content: cached.extractedContent,
        contentType: 'web',
        quality: cached.contentQuality || 7,
        metadata: {
          title: (cached.extractionMetadata as any)?.title,
          url: cached.originalUrl || url,
          wordCount: cached.extractedContent.split(/\s+/).length,
          extractionTime: Date.now() - startTime,
          cached: true
        }
      };
    }
    
    // Fetch the web page
    const response = await axios.get(url, {
      timeout: AUTO_CREATE_SERVER_CONFIG.WEB_SCRAPING_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    // Parse HTML content
    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share').remove();
    
    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
    
    // Extract main content - try multiple selectors
    let content = '';
    const contentSelectors = [
      'article',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      'main',
      '.main-content',
      '#content',
      '.container'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 200) break; // Found substantial content
      }
    }
    
    // Fallback to body if no specific content found
    if (!content || content.length < 100) {
      content = $('body').text().trim();
    }
    
    // Clean up the content
    content = content
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
    
    // Assess content quality
    const quality = assessWebContentQuality(content, title);
    
    // Cache the result
    await cacheContent(contentHash, 'web', url, content, quality, {
      title,
      extractionTime: Date.now() - startTime
    });
    
    return {
      success: true,
      content,
      contentType: 'web',
      quality,
      metadata: {
        title,
        url,
        wordCount: content.split(/\s+/).length,
        extractionTime: Date.now() - startTime,
        cached: false
      }
    };
    
  } catch (error) {
    console.error('Web content extraction error:', error);
    
    return {
      success: false,
      content: '',
      contentType: 'web',
      quality: 0,
      metadata: {
        url,
        wordCount: 0,
        extractionTime: Date.now() - startTime,
        cached: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Extract transcript from YouTube videos
 */
export async function extractYouTubeTranscript(url: string): Promise<ContentExtractionResult> {
  const startTime = Date.now();
  
  try {
    // Extract video ID from URL
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }
    
    // Check cache first
    const contentHash = crypto.createHash('md5').update(`youtube:${videoId}`).digest('hex');
    const cached = await getCachedContent(contentHash);
    
    if (cached) {
      return {
        success: true,
        content: cached.extractedContent,
        contentType: 'youtube',
        quality: cached.contentQuality || 7,
        metadata: {
          title: (cached.extractionMetadata as any)?.title,
          url,
          wordCount: cached.extractedContent.split(/\s+/).length,
          extractionTime: Date.now() - startTime,
          cached: true
        }
      };
    }
    
    // Validate YouTube API key before making calls
    const youtubeApiKey = process.env.YOUTUBE_API_KEY || AUTO_CREATE_SERVER_CONFIG.YOUTUBE_API_KEY;
    if (!youtubeApiKey) {
      throw new Error('YouTube API key not configured');
    }
    
    console.log(`🎥 Using YouTube API key: ${youtubeApiKey.substring(0, 10)}...${youtubeApiKey.slice(-4)}`);
    
    // Initialize YouTube API
    const youtube = google.youtube({
      version: 'v3',
      auth: youtubeApiKey
    });
    
    // Get video details
    const videoResponse = await youtube.videos.list({
      part: ['snippet'],
      id: [videoId]
    });
    
    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      throw new Error('Video not found');
    }
    
    const videoDetails = videoResponse.data.items[0];
    const title = videoDetails.snippet?.title || 'Untitled Video';
    
    // Try to get captions/transcript
    const captionsResponse = await youtube.captions.list({
      part: ['snippet'],
      videoId: videoId
    });
    
    let transcript = '';
    
    if (captionsResponse.data.items && captionsResponse.data.items.length > 0) {
      // Find English captions or first available
      const englishCaption = captionsResponse.data.items.find(
        item => item.snippet?.language === 'en'
      ) || captionsResponse.data.items[0];
      
      if (englishCaption?.id) {
        try {
          // Download caption content
          const captionContent = await youtube.captions.download({
            id: englishCaption.id,
            tfmt: 'srt' // SubRip format
          });
          
          // Parse SRT format to extract text
          transcript = parseSRTContent(captionContent.data as string);
        } catch (captionError) {
          console.warn('Failed to download captions:', captionError);
        }
      }
    }
    
    // If no transcript available, use video description as fallback
    if (!transcript) {
      transcript = videoDetails.snippet?.description || '';
      if (transcript.length < 50) {
        throw new Error('No transcript available and description too short');
      }
    }
    
    // Clean up transcript
    transcript = transcript
      .replace(/\[.*?\]/g, '') // Remove timestamp markers
      .replace(/\s+/g, ' ')
      .trim();
    
    const quality = assessTranscriptQuality(transcript);
    
    // Cache the result
    await cacheContent(contentHash, 'youtube', url, transcript, quality, {
      title,
      videoId,
      extractionTime: Date.now() - startTime
    });
    
    return {
      success: true,
      content: transcript,
      contentType: 'youtube',
      quality,
      metadata: {
        title,
        url,
        wordCount: transcript.split(/\s+/).length,
        extractionTime: Date.now() - startTime,
        cached: false
      }
    };
    
  } catch (error) {
    console.error('YouTube transcript extraction error:', error);
    
    return {
      success: false,
      content: '',
      contentType: 'youtube',
      quality: 0,
      metadata: {
        url,
        wordCount: 0,
        extractionTime: Date.now() - startTime,
        cached: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Parse SRT (SubRip) format to extract plain text
 */
function parseSRTContent(srtContent: string): string {
  const lines = srtContent.split('\n');
  const textLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip sequence numbers and timestamps
    if (/^\d+$/.test(line) || /^\d{2}:\d{2}:\d{2}/.test(line)) {
      continue;
    }
    
    // Skip empty lines
    if (!line) {
      continue;
    }
    
    textLines.push(line);
  }
  
  return textLines.join(' ');
}

/**
 * Assess quality of web content
 */
function assessWebContentQuality(content: string, title: string): number {
  let quality = 10;
  
  // Length assessment
  if (content.length < 200) quality -= 4;
  else if (content.length < 500) quality -= 2;
  else if (content.length < 1000) quality -= 1;
  
  // Structure assessment
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length < 3) quality -= 2;
  
  // Title relevance (basic check)
  if (title && title.length > 5) quality += 1;
  
  // Check for common junk content indicators
  const junkIndicators = ['cookie', 'privacy policy', 'terms of service', 'subscribe', 'newsletter'];
  const junkCount = junkIndicators.filter(indicator => 
    content.toLowerCase().includes(indicator)
  ).length;
  
  if (junkCount > 2) quality -= 2;
  
  return Math.max(1, Math.min(10, quality));
}

/**
 * Assess quality of transcript content
 */
function assessTranscriptQuality(transcript: string): number {
  let quality = 8; // Start higher for transcripts as they're usually cleaner
  
  // Length assessment
  if (transcript.length < 300) quality -= 3;
  else if (transcript.length < 800) quality -= 1;
  
  // Check for transcript quality indicators
  if (transcript.includes('[Music]') || transcript.includes('[Applause]')) {
    quality += 1; // Good transcript formatting
  }
  
  // Check for repetitive content (common in auto-generated transcripts)
  const words = transcript.split(/\s+/);
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const uniqueRatio = uniqueWords.size / words.length;
  
  if (uniqueRatio < 0.3) quality -= 2; // Very repetitive
  else if (uniqueRatio < 0.5) quality -= 1;
  
  return Math.max(1, Math.min(10, quality));
}

/**
 * Cache extracted content
 */
async function cacheContent(
  contentHash: string,
  contentType: 'web' | 'youtube' | 'document',
  originalUrl: string,
  content: string,
  quality: number,
  metadata: any
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + AUTO_CREATE_SERVER_CONFIG.CONTENT_CACHE_TTL);
    
    await db.insert(contentCache).values({
      contentHash,
      contentType,
      originalUrl,
      extractedContent: content,
      contentQuality: quality,
      extractionMetadata: metadata,
      expiresAt
    });
  } catch (error) {
    console.warn('Failed to cache content:', error);
    // Don't throw error - caching failure shouldn't break extraction
  }
}

/**
 * Get cached content
 */
async function getCachedContent(contentHash: string) {
  try {
    const cached = await db
      .select()
      .from(contentCache)
      .where(eq(contentCache.contentHash, contentHash))
      .limit(1);
    
    if (cached.length > 0) {
      const item = cached[0];
      
      // Check if expired
      if (new Date() > item.expiresAt) {
        // Delete expired item
        await db.delete(contentCache).where(eq(contentCache.id, item.id));
        return null;
      }
      
      return item;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to get cached content:', error);
    return null;
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const result = await db
      .delete(contentCache)
      .where(eq(contentCache.expiresAt, new Date()));
    
    return result as any; // Drizzle typing issue
  } catch (error) {
    console.error('Failed to cleanup expired cache:', error);
    return 0;
  }
}