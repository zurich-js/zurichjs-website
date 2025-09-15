export default function KitSectionContent({
    children,
    className = '',
    spaced
} : {
    children: React.ReactNode;
    className?: string;
    spaced?: boolean;
}) {
    return (
        <div className={`w-full flex flex-col flex-1 ${spaced ? 'mt-8' : ''} ${className}`}>
          {children}
        </div>
    )
}
