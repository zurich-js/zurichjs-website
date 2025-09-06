export default function KitSectionContent({
    children,
    className = '',
} : {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`w-full flex flex-col flex-1 ${className}`}>
          {children}
        </div>
    )
}
