// Constants
const CREATOR_QUIZZES_KEY = 'qzonme_creator_quizzes';
const CURRENT_QUIZ_ID_KEY = 'qzonme_current_quiz_id';

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
 * Now supports multiple quizzes by storing them in an array
 */
export function saveCreatorQuiz(quizData: CreatorQuizData): void {
  try {
    console.log(`Saving quiz to localStorage: ID ${quizData.quizId}, creator: ${quizData.creatorName}`);
    
    // Get existing quizzes or initialize empty array
    const existingQuizzes = getAllCreatorQuizzes();
    
    // Replace if exists, otherwise add new
    const quizIndex = existingQuizzes.findIndex(q => q.quizId === quizData.quizId);
    if (quizIndex >= 0) {
      existingQuizzes[quizIndex] = quizData;
    } else {
      existingQuizzes.push(quizData);
    }
    
    // Store back to localStorage
    localStorage.setItem(CREATOR_QUIZZES_KEY, JSON.stringify(existingQuizzes));
    
    // Set this as the current quiz
    setCurrentQuizId(quizData.quizId);
  } catch (error) {
    console.error('Error saving quiz to localStorage:', error);
  }
}

/**
 * Sets the current active quiz ID
 */
export function setCurrentQuizId(quizId: number): void {
  try {
    localStorage.setItem(CURRENT_QUIZ_ID_KEY, quizId.toString());
  } catch (error) {
    console.error('Error setting current quiz ID:', error);
  }
}

/**
 * Gets the current active quiz ID
 */
export function getCurrentQuizId(): number | null {
  try {
    const id = localStorage.getItem(CURRENT_QUIZ_ID_KEY);
    return id ? parseInt(id) : null;
  } catch (error) {
    console.error('Error getting current quiz ID:', error);
    return null;
  }
}

/**
 * Retrieves all saved quizzes from localStorage
 */
export function getAllCreatorQuizzes(): CreatorQuizData[] {
  try {
    const savedData = localStorage.getItem(CREATOR_QUIZZES_KEY);
    if (!savedData) return [];
    
    return JSON.parse(savedData);
  } catch (error) {
    console.error('Error retrieving quizzes from localStorage:', error);
    return [];
  }
}

/**
 * Retrieves the most recently saved quiz data from localStorage
 * For backward compatibility
 */
export function getCreatorQuiz(): CreatorQuizData | null {
  try {
    // First check if we have a current quiz ID
    const currentQuizId = getCurrentQuizId();
    if (currentQuizId) {
      const quizzes = getAllCreatorQuizzes();
      const currentQuiz = quizzes.find(q => q.quizId === currentQuizId);
      if (currentQuiz) return currentQuiz;
    }
    
    // Fallback: get the last quiz in the array
    const quizzes = getAllCreatorQuizzes();
    return quizzes.length > 0 ? quizzes[quizzes.length - 1] : null;
  } catch (error) {
    console.error('Error retrieving quiz from localStorage:', error);
    return null;
  }
}

/**
 * Retrieves a specific quiz by ID
 */
export function getCreatorQuizById(quizId: number): CreatorQuizData | null {
  try {
    const quizzes = getAllCreatorQuizzes();
    return quizzes.find(q => q.quizId === quizId) || null;
  } catch (error) {
    console.error(`Error retrieving quiz ${quizId} from localStorage:`, error);
    return null;
  }
}

/**
 * Removes a specific quiz from localStorage
 */
export function removeCreatorQuizById(quizId: number): void {
  try {
    const quizzes = getAllCreatorQuizzes();
    const filteredQuizzes = quizzes.filter(q => q.quizId !== quizId);
    localStorage.setItem(CREATOR_QUIZZES_KEY, JSON.stringify(filteredQuizzes));
    
    // If we're removing the current quiz, update the current quiz ID
    const currentId = getCurrentQuizId();
    if (currentId === quizId && filteredQuizzes.length > 0) {
      setCurrentQuizId(filteredQuizzes[filteredQuizzes.length - 1].quizId);
    } else if (filteredQuizzes.length === 0) {
      localStorage.removeItem(CURRENT_QUIZ_ID_KEY);
    }
  } catch (error) {
    console.error(`Error removing quiz ${quizId} from localStorage:`, error);
  }
}

/**
 * Removes all saved quiz data from localStorage
 */
export function clearCreatorQuiz(): void {
  try {
    localStorage.removeItem(CREATOR_QUIZZES_KEY);
    localStorage.removeItem(CURRENT_QUIZ_ID_KEY);
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