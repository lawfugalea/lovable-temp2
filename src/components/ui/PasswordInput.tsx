import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  id?: string;
  name?: string;
  disabled?: boolean;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder = "••••••••",
  className = "",
  autoComplete = "current-password",
  required = false,
  minLength,
  maxLength,
  id,
  name,
  disabled = false,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before showing password toggle
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative">
      <input
        type={isMounted && showPassword ? "text" : "password"}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        disabled={disabled}
        className={`w-full border border-cozy-gray-300 rounded-lg bg-cozy-surface px-4 py-3 pr-12 text-cozy-text focus:outline-none focus:border-cozy-primary focus:ring-2 focus:ring-cozy-primary/20 transition-all ${className}`}
      />
      
      {isMounted && (
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cozy-text-muted hover:text-cozy-primary transition-colors focus:outline-none focus:text-cozy-primary"
          tabIndex={-1}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff size={20} />
          ) : (
            <Eye size={20} />
          )}
        </button>
      )}
    </div>
  );
}
