import React, { InputHTMLAttributes, useState, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  icon?: ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, id, className, type, icon, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="group/input flex w-full flex-col gap-1.5">
      <label
        htmlFor={id}
        className="ml-1 text-[11px] font-bold uppercase tracking-widest text-gray-500 transition-colors group-focus-within/input:text-qamaster-primary"
      >
        {label}
      </label>
      <div className="relative">
        {/* Left Icon */}
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 group-focus-within/input:text-qamaster-primary">
            {icon}
          </div>
        )}

        <input
          id={id}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className={`w-full rounded-sm border border-gray-200 bg-gray-50 py-3.5 text-sm font-medium text-gray-900 placeholder-gray-400 transition-all duration-200 ease-in-out focus:border-qamaster-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-qamaster-primary ${icon ? 'pl-11' : 'pl-4'} ${isPassword ? 'pr-11' : 'pr-4'} ${className || ''} `}
          {...props}
        />

        {/* Password Toggle Button */}
        {isPassword && (
          <button
            type="button"
            onClick={handleTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745A10.251 10.251 0 002.482 12.01a.75.75 0 101.496.088 8.749 8.749 0 0111.964-3.26L3.28 2.22zm7.691 7.691a1.125 1.125 0 00-1.591 1.591l1.591-1.591z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                <path
                  fillRule="evenodd"
                  d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
