import React, { useEffect, useState } from "react";
import { QuizAttempt } from "@shared/schema";
import { formatPercentage } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LeaderboardProps {
  attempts: QuizAttempt[];
  currentUserName?: string;
  currentUserScore?: number;
  currentUserTotalQuestions?: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ 
  attempts, 
  currentUserName,
  currentUserScore = 0,
  currentUserTotalQuestions = 1
}) => {
  // Track when attempts data changes to force refresh
  const [processedAttempts, setProcessedAttempts] = useState<QuizAttempt[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Force refresh the leaderboard data when attempts change
  useEffect(() => {
    console.log("Leaderboard received new attempts data:", { 
      attemptsCount: attempts?.length, 
      attempt_ids: attempts?.map(a => a.id)
    });
    
    // Simulate a small delay to show loading indicator
    setIsRefreshing(true);
    setTimeout(() => {
      setProcessedAttempts([...attempts]);
      setIsRefreshing(false);
    }, 300);
  }, [attempts, attempts?.length]);
  
  console.log("Leaderboard rendering with:", { 
    attemptsCount: processedAttempts?.length, 
    currentUserName,
    currentUserScore 
  });

  // Create a virtual array that includes both real attempts and current user 
  // (in case they're not in the attempts list yet)
  const prepareLeaderboardData = () => {
    // Start with sorted attempts array (if any)
    let sortedData = [...(attempts || [])].sort((a, b) => {
      const scoreA = (a.score / a.totalQuestions) * 100;
      const scoreB = (b.score / b.totalQuestions) * 100;
      return scoreB - scoreA;
    });

    // Check if current user exists in the attempts data
    const userExists = currentUserName && sortedData.some(a => a.userName === currentUserName);
    
    // If user doesn't exist in the attempts but we have their name and score, add them
    if (currentUserName && !userExists) {
      // Create a virtual attempt for the current user
      const userAttempt = {
        id: -1, // Use negative ID to indicate it's a virtual entry
        quizId: 0,
        userAnswerId: 0,
        userName: currentUserName,
        score: currentUserScore,
        totalQuestions: currentUserTotalQuestions,
        answers: [],
        completedAt: new Date()
      };
      
      // Add to sorted array to get correct position
      sortedData.push(userAttempt);
      
      // Resort to ensure it's in the right position
      sortedData = sortedData.sort((a, b) => {
        const scoreA = (a.score / (a.totalQuestions || 1)) * 100;
        const scoreB = (b.score / (b.totalQuestions || 1)) * 100;
        return scoreB - scoreA;
      });
    }
    
    return sortedData;
  };

  // If refreshing show loading state
  if (isRefreshing) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
        <p className="text-muted-foreground text-sm">Refreshing leaderboard...</p>
      </div>
    );
  }
  
  // Generate the leaderboard rows using the processed attempts
  const leaderboardData = () => {
    // Start with sorted processed attempts
    let sortedData = [...(processedAttempts || [])].sort((a, b) => {
      const scoreA = (a.score / a.totalQuestions) * 100;
      const scoreB = (b.score / b.totalQuestions) * 100;
      return scoreB - scoreA;
    });

    // Check if current user exists in the attempts data
    const userExists = currentUserName && sortedData.some(a => a.userName === currentUserName);
    
    // If user doesn't exist in the attempts but we have their name and score, add them
    if (currentUserName && !userExists && currentUserScore !== undefined) {
      // Create a virtual attempt for the current user
      const userAttempt = {
        id: -1, // Use negative ID to indicate it's a virtual entry
        quizId: 0,
        userAnswerId: 0,
        userName: currentUserName,
        score: currentUserScore,
        totalQuestions: currentUserTotalQuestions,
        answers: [],
        completedAt: new Date()
      };
      
      // Add to sorted array to get correct position
      sortedData.push(userAttempt);
      
      // Resort to ensure it's in the right position
      sortedData = sortedData.sort((a, b) => {
        const scoreA = (a.score / (a.totalQuestions || 1)) * 100;
        const scoreB = (b.score / (b.totalQuestions || 1)) * 100;
        return scoreB - scoreA;
      });
    }
    
    return sortedData;
  };
  
  const sortedLeaderboardData = leaderboardData();
  
  // If there's no data at all, show empty state
  if (sortedLeaderboardData.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 p-4 text-center text-gray-500">
        No attempts yet
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rank
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Score
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedLeaderboardData.map((attempt, index) => {
            const isCurrentUser = currentUserName && attempt.userName === currentUserName;
            
            return (
              <tr 
                key={`${attempt.id}-${index}`}
                className={isCurrentUser ? "bg-primary bg-opacity-5" : ""}
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {index + 1}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {isCurrentUser ? (
                    <span className="font-medium text-primary">You ({attempt.userName})</span>
                  ) : (
                    attempt.userName || "Anonymous"
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-primary font-medium">
                  {formatPercentage(attempt.score, attempt.totalQuestions || 1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
