import React from 'react';
import { UserScore } from '../types';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  score: UserScore | null;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score }) => {
  if (!score) {
    return (
      <div className="score-display">
        <div className="score-placeholder">
          Saisissez vos notes pour calculer votre score
        </div>
      </div>
    );
  }

  return (
    <div className="score-display">
      <h2>Votre Score Affelnet</h2>
      <div className="total-score-container">
        <div className="total-score-value">
          {Math.round(score.totalScore).toLocaleString()}
        </div>
        <div className="total-score-max">
          sur 38 400 points
        </div>
      </div>
      
      {/* Task 2 will implement the breakdown here */}
    </div>
  );
};

export default ScoreDisplay;
