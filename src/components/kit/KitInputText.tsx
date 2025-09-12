export default function KitInputText({
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
  extra?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  valueTransform?: (value: string | number) => string | number;
  [x: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {

  console.log('valueTransform', valueTransform);

  return (
    <label className="flex flex-col gap-1 text-kit-sm">
      {label && <span>{label}</span>}
      <input
        type={type}
        {...(onChange ? { onChange: (e) => onChange(e.target.value) } : {})}
        {...(value !== undefined ? {value} : {})}
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
  )
}
