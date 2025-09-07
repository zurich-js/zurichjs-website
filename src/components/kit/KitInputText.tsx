export default function KitInputText({
    label,
    value,
    type = 'text',
    onChange,
    placeholder = '',
    extra,
    ...props
}: {
  label: string;
  value?: string | number;
  type?: 'text' | 'email' | 'password' | 'number';
  extra?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  [x: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {

  return (
    <label className="flex flex-col gap-1 text-kit-sm">
      <span>{label}</span>
      <input
        type={type}
        {...(onChange ? { onChange: (e) => onChange(e.target.value) } : {})}
        {...(value !== undefined ? {value} : {})}
        placeholder={placeholder}
        className="rounded-[40px] p-2 px-4 border-2 border-kit-gray-medium hover:border-kit-gray-dark transition-all duration-300 focus:outline-0 focus:ring-2 focus: ring-zurich ring-offset-2 placeholder:text-kit-gray"
        {...props}
      />
      {extra && <span className="text-kit-xs text-kit-gray-dark">{extra}</span>}
    </label>
  )
}
