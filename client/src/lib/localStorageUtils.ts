// Constants
const CREATOR_QUIZ_KEY = 'qzonme_creator_quiz';

// Types
interface CreatorQuizData {
  quizId: number;
  accessCode: string;
  urlSlug: string;
  createdAt: string;
  creatorName: string;
}

/**
 * Saves quiz data to localStorage for the creator
 */
export function saveCreatorQuiz(quizData: CreatorQuizData): void {
  try {
    localStorage.setItem(CREATOR_QUIZ_KEY, JSON.stringify(quizData));
  } catch (error) {
    console.error('Error saving quiz to localStorage:', error);
  }
}

/**
 * Retrieves saved quiz data from localStorage
 */
export function getCreatorQuiz(): CreatorQuizData | null {
  try {
    const savedData = localStorage.getItem(CREATOR_QUIZ_KEY);
    if (!savedData) return null;
    
    return JSON.parse(savedData);
  } catch (error) {
    console.error('Error retrieving quiz from localStorage:', error);
    return null;
  }
}

/**
 * Removes saved quiz data from localStorage
 */
export function clearCreatorQuiz(): void {
  try {
    localStorage.removeItem(CREATOR_QUIZ_KEY);
  } catch (error) {
    console.error('Error clearing quiz from localStorage:', error);
  }
}

/**
 * Checks if the quiz has expired (30 days from creation)
 */
export function isQuizExpired(createdAt: string): boolean {
  try {
    const creationDate = new Date(createdAt);
    const now = new Date();
    
    // Calculate expiration date (30 days after creation)
    const expirationDate = new Date(creationDate);
    expirationDate.setDate(expirationDate.getDate() + 30);
    
    return now > expirationDate;
  } catch (error) {
    console.error('Error checking quiz expiration:', error);
    return true; // Return expired if there's an error
  }
}