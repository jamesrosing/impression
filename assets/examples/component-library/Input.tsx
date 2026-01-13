import React from 'react';
import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}: InputProps) => {
  const baseStyles = 'w-full px-3 py-2 border border-[#f7f8f8] rounded-[4px] text-[#f7f8f8] placeholder:text-[#d0d6e0] focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50';
  const errorStyles = 'border-[#ef4444] text-[#ef4444] focus:ring-[#ef4444]';
  const labelStyles = 'text-sm font-medium text-[#f7f8f8]';
  const helperStyles = 'text-sm text-[#d0d6e0]';

  return (
    <div className="flex flex-col gap-1">
      {label && <label className={labelStyles}>{label}</label>}
      <input
        className={`${baseStyles} ${error ? errorStyles : ''} ${className}`}
        {...props}
      />
      {error && <span className={errorStyles}>{error}</span>}
      {helperText && !error && <span className={helperStyles}>{helperText}</span>}
    </div>
  );
};

export default Input;
