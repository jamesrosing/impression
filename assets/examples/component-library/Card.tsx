import React from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Card = ({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  ...props
}: CardProps) => {
  const baseStyles = 'rounded-[6px] bg-[#0f1011]';

  const variantStyles: Record<string, string> = {
    default: 'border border-[#f7f8f8]',
    elevated: 'shadow-[0 1px 3px rgba(0,0,0,0.1)]',
    outlined: 'border-2 border-[#f7f8f8]',
  };

  const paddingStyles: Record<string, string> = {
    none: 'p-0',
    sm: 'p-[6pxpx]',
    md: 'p-[8pxpx]',
    lg: 'p-[10pxpx]',
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
