import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { log } from './vite';

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'djkecqprm',
  api_key: '412876169339576',
  api_secret: 'qAQFpDVPgT2_HDKvZ18sTPOqmYw'
});

// Helper function to read a file and return a readable stream
function createReadStream(filePath: string) {
  return fs.createReadStream(filePath);
}

/**
 * Uploads an image file to Cloudinary with optimization
 * @param filePath Path to the local image file
 * @param quizId ID of the quiz for tagging
 * @returns Cloudinary upload result with secure_url
 */
export async function uploadToCloudinary(filePath: string, quizId: number) {
  try {
    // Get file name for logging
    const fileName = path.basename(filePath);
    log(`Uploading ${fileName} to Cloudinary for quiz ${quizId}...`);

    // Upload the file with transformations
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'qzonme',
      resource_type: 'image',
      transformation: [
        { width: 800, crop: 'limit' }, // Resize to max 800px width
        { quality: 'auto:good' },      // Auto quality
        { fetch_format: 'webp' }       // Convert to WebP
      ],
      tags: [`quiz:${quizId}`],        // Tag with quiz ID for later deletion
    });

    log(`Successfully uploaded ${fileName} to Cloudinary. URL: ${result.secure_url}`);
    return result;
  } catch (error) {
    log(`Error uploading to Cloudinary: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to upload image to Cloudinary: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Deletes all images from Cloudinary that match the given tag
 * @param quizId The quiz ID for tag matching
 * @returns Promise resolving to the deletion result
 */
export async function deleteImagesByQuizId(quizId: number) {
  try {
    log(`Deleting all images for quiz ${quizId} from Cloudinary...`);
    const result = await cloudinary.api.delete_resources_by_tag(`quiz:${quizId}`);
    log(`Successfully deleted images for quiz ${quizId}`);
    return result;
  } catch (error) {
    log(`Error deleting images for quiz ${quizId}: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to delete images for quiz ${quizId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Cleanup function to delete all images for quizzes older than 7 days
 * @returns Promise resolving to the cleanup result
 */
export async function cleanupOldQuizImages(oldQuizIds: number[]) {
  if (!oldQuizIds || oldQuizIds.length === 0) {
    log('No old quizzes to clean up');
    return;
  }

  try {
    log(`Cleaning up images for ${oldQuizIds.length} old quizzes...`);
    
    // Delete images for each old quiz
    for (const quizId of oldQuizIds) {
      await deleteImagesByQuizId(quizId);
    }
    
    log(`Cleanup complete for ${oldQuizIds.length} old quizzes`);
    return { success: true, count: oldQuizIds.length };
  } catch (error) {
    log(`Error during image cleanup: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to clean up old quiz images: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Test connection to Cloudinary
export async function testCloudinaryConnection() {
  try {
    const result = await cloudinary.api.ping();
    log('Cloudinary connection test: ' + (result.status === 'ok' ? 'Success' : 'Failed'));
    return result.status === 'ok';
  } catch (error) {
    log(`Cloudinary connection test failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}