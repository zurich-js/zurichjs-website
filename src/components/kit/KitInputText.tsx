import React, { useState, useEffect, useRef } from 'react';

function KitInputTextTransformed({
  label,
  value,
  type = 'text',
  onChange,
  placeholder = '',
  extra,
  className = '',
  valueTransform,
  ...props
}: {
  label?: string;
  value?: string | number;
  type?: 'text' | 'email' | 'password' | 'number';
  extra?: string | React.ReactNode;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  valueTransform: (value: string | number) => string | number;
  [x: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value !== undefined) {
      return String(valueTransform(value));
    }
    return '';
  });
  const [isFocused, setIsFocused] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const displayInputRef = useRef<HTMLInputElement>(null);

  // Only update display value when not focused (to avoid interrupting typing)
  useEffect(() => {
    if (!isFocused && value !== undefined) {
      setDisplayValue(String(valueTransform(value)));
    }
  }, [value, valueTransform, isFocused]);

  const handleDisplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    onChange?.(inputValue);
  };

  const handleDisplayFocus = () => {
    setIsFocused(true);
    if (value !== undefined) {
      setDisplayValue(String(value));
    }
  };

  const handleDisplayBlur = () => {
    setIsFocused(false);
    if (value !== undefined) {
      setDisplayValue(String(valueTransform(value)));
    }
  };

  return (
    <label className="flex flex-col gap-1 text-kit-sm">
      {label && <span>{label}</span>}
      {/* Hidden input for the actual controlled value */}
      <input
        ref={hiddenInputRef}
        className="hidden"
        type={type}
        value={value}
        onChange={() => {}} // Controlled by parent
      />
      {/* Visible input for display */}
      <input
        ref={displayInputRef}
        type="text" // Always text for display
        value={displayValue}
        onChange={handleDisplayChange}
        onFocus={handleDisplayFocus}
        onBlur={handleDisplayBlur}
        placeholder={placeholder}
        className={
          `rounded-[40px] leading-6 p-2 px-4
          border-2 border-kit-gray-medium hover:border-kit-gray-dark
          transition-all duration-300 focus:outline-0 focus:ring-2
          focus: ring-zurich ring-offset-2 placeholder:text-kit-gray
          ${className}`
        }
        {...props}
      />
      {extra && <span className="text-kit-xs text-kit-gray-dark">{extra}</span>}
    </label>
  );
}

export default function KitInputText({
    label,
    value,
    type = 'text',
    onChange,
    placeholder = '',
    extra,
    className = '',
    valueTransform,
    children,
    disabled,
    ...props
}: {
  label?: string;
  value?: string | number;
  type?: 'text' | 'email' | 'password' | 'number';
  extra?: string | React.ReactNode;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  valueTransform?: (value: string | number) => string | number;
  children?: React.ReactNode;
  disabled?: boolean;
  [x: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  // Use transformed component if valueTransform is provided
  if (valueTransform) {
    return (
      <KitInputTextTransformed
        label={label}
        value={value}
        type={type}
        onChange={onChange}
        placeholder={placeholder}
        extra={extra}
        className={className}
        valueTransform={valueTransform}
        {...props}
      />
    );
  }

  // Normal input when no transformation
  return (
    <label className="flex flex-col gap-1 text-kit-sm">
      {label && <span>{label}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={
          `rounded-[40px] leading-6 p-2 px-4
          border-2 border-kit-gray-medium
          transition-all duration-300 focus:outline-0 focus:ring-2
          ring-offset-2 placeholder:text-kit-gray
          ${disabled ? 'bg-kit-gray-light cursor-not-allowed' : 'hover:border-kit-gray-dark focus: ring-zurich'}
          ${className}`
        }
        disabled={disabled}
        {...props}
      />
      {children}
      {extra && <span className="text-kit-xs text-kit-gray-dark">{extra}</span>}
    </label>
  )
}
