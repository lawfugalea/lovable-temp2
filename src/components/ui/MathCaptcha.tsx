import React, { useState, useEffect } from 'react';

interface MathCaptchaProps {
  onVerify: (isValid: boolean) => void;
  className?: string;
}

export default function MathCaptcha({ onVerify, className = '' }: MathCaptchaProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const generateQuestion = () => {
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let num1: number, num2: number, result: number;
    
    switch (operation) {
      case '+':
        num1 = Math.floor(Math.random() * 20) + 1;
        num2 = Math.floor(Math.random() * 20) + 1;
        result = num1 + num2;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 20) + 10;
        num2 = Math.floor(Math.random() * 10) + 1;
        result = num1 - num2;
        break;
      case '*':
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        result = num1 * num2;
        break;
      default:
        num1 = 1;
        num2 = 1;
        result = 2;
    }
    
    setQuestion(`${num1} ${operation} ${num2} = ?`);
    setAnswer(result.toString());
    setUserAnswer('');
    setIsVerified(false);
    onVerify(false);
  };

  useEffect(() => {
    generateQuestion();
  }, []);

  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserAnswer(value);
    
    if (value === answer) {
      setIsVerified(true);
      onVerify(true);
    } else {
      setIsVerified(false);
      onVerify(false);
    }
  };

  const handleRefresh = () => {
    generateQuestion();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-cozy-text mb-2 flex items-center gap-2">
        <span>🧮</span>
        Security Check
      </label>
      
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="bg-cozy-surface border border-cozy-gray-300 rounded-lg px-4 py-3 text-center font-mono text-lg">
            {question}
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleRefresh}
          className="px-3 py-2 text-cozy-text-muted hover:text-cozy-primary transition-colors"
          title="Generate new question"
        >
          🔄
        </button>
      </div>
      
      <input
        type="number"
        value={userAnswer}
        onChange={handleAnswerChange}
        className={`w-full border rounded-lg px-4 py-3 text-cozy-text focus:outline-none focus:ring-2 transition-all ${
          isVerified
            ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
            : userAnswer && !isVerified
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-cozy-gray-300 focus:border-cozy-primary focus:ring-cozy-primary/20'
        }`}
        placeholder="Your answer"
        required
      />
      
      {isVerified && (
        <div className="text-green-600 text-sm flex items-center gap-2">
          <span>✅</span>
          Verification complete!
        </div>
      )}
      
      <p className="text-xs text-cozy-text-muted">
        Please solve this simple math problem to verify you're human
      </p>
    </div>
  );
}
