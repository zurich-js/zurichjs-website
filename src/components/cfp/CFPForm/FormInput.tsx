import { AlertCircle } from 'lucide-react';
import { ChangeEvent } from 'react';

interface FormInputProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'url';
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  isTextarea?: boolean;
  rows?: number;
}

export default function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required,
  placeholder,
  helpText,
  isTextarea,
  rows = 5,
}: FormInputProps) {
  const inputClasses = `
    w-full px-4 py-3 border rounded-lg
    focus:outline-none focus:ring-2 transition-all
    ${
      error
        ? 'border-red-500 focus:ring-red-500 bg-red-50'
        : 'border-gray-300 focus:ring-js hover:border-gray-400'
    }
  `;

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-gray-700 mb-2 font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {isTextarea ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className={inputClasses}
          placeholder={placeholder}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className={inputClasses}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      )}
      {error && (
        <p id={`${name}-error`} className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle size={14} />
          {error}
        </p>
      )}
      {helpText && !error && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
    </div>
  );
}
