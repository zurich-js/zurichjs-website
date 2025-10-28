export default function WorkshopPricingItemRow({
 children
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="flex [&>:first-child]:basis-[300px] [&>:nth-child(2)]:ml-auto">
      {children}
    </div>
  )
}
