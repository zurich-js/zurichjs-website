export default function KitSectionTitle({
  children,
  className = '',
} : {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`w-full flex flex-col max-w-[200px] text-kit-lg font-medium mt-3 ${className}`}>
      {children}
    </h2>
  )
}
