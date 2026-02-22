import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, isLoading, className, ...props }) => {
  return (
    <button
      className={`group flex w-full items-center justify-center rounded-sm bg-black px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-sm transition-all duration-300 ease-in-out hover:bg-qamaster-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none ${className} `}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg
          className="h-5 w-5 animate-spin text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : (
        <span className="flex items-center gap-2">
          {children}
          <span className="transform text-lg leading-none transition-transform duration-300 group-hover:translate-x-1 group-disabled:hidden">
            &rsaquo;
          </span>
        </span>
      )}
    </button>
  );
};
