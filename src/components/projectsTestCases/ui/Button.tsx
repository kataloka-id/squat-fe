import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border";
  
  const variants = {
    // Flat brand color, no gradient, slight shadow
    primary: "bg-brand-600 hover:bg-brand-700 text-white border-transparent shadow-sm hover:shadow focus:ring-brand-500",
    // Clean white with border
    secondary: "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm focus:ring-slate-200",
    // Subtle danger
    danger: "bg-white text-red-600 border-red-200 hover:bg-red-50 focus:ring-red-500",
    // Transparent
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-transparent",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className={`${children ? 'mr-2' : ''} h-4 w-4 flex items-center`}>{icon}</span>}
      {children}
    </button>
  );
};