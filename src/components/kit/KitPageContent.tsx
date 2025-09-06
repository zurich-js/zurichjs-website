export default function KitPageContent({
   children,
   className = '',
   hasTOC = false,
}: {
  children: React.ReactNode;
  className?: string;
  hasTOC?: boolean;
}) {

  return (
    <div className={`bg-white container mx-auto px-6 max-w-[1440px] py-10 flex justify-between ${className}`}>
      <div className={`w-full flex flex-col gap-20 flex-1 ${hasTOC ? 'max-w-[920px]' : ''}`}>
        {children}
      </div>
      {hasTOC && (
        <div className="basis-[200px] shrink-0 grow-0">TOC goes here</div>
      )}
    </div>
  )
}
