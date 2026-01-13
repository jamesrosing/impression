import React from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50';

  const variantStyles: Record<string, string> = {
    primary: 'bg-[#5e6ad2] text-white hover:opacity-90',
    secondary: 'bg-[#f3f4f6] text-gray-900 hover:bg-opacity-80',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
    ghost: 'bg-transparent hover:bg-gray-100',
  };

  const sizeStyles: Record<string, string> = {
    sm: 'h-8 px-3 text-sm rounded-[4px]',
    md: 'h-10 px-4 text-sm rounded-[4px]',
    lg: 'h-12 px-6 text-base rounded-[4px]',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
