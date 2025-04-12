import React from "react";
import { QuizAttempt } from "@shared/schema";
import { formatPercentage } from "@/lib/utils";

interface LeaderboardProps {
  attempts: QuizAttempt[];
  currentUserName?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ attempts, currentUserName }) => {
  // Sort attempts by score descending
  const sortedAttempts = [...attempts].sort((a, b) => {
    const scoreA = (a.score / a.totalQuestions) * 100;
    const scoreB = (b.score / b.totalQuestions) * 100;
    return scoreB - scoreA;
  });

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
          {sortedAttempts.length > 0 ? (
            sortedAttempts.map((attempt, index) => (
              <tr 
                key={attempt.id}
                className={currentUserName && attempt.userName === currentUserName 
                  ? "bg-primary bg-opacity-5" 
                  : ""
                }
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {index + 1}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  {currentUserName && attempt.userName === currentUserName ? (
                    <span className="font-medium text-primary">You ({attempt.userName})</span>
                  ) : (
                    attempt.userName
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-primary font-medium">
                  {formatPercentage(attempt.score, attempt.totalQuestions)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="px-4 py-3 text-center text-sm text-gray-500">
                No attempts yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
