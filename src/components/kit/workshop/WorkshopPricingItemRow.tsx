export default function WorkshopPricingItemRow({
 left,
 right
}: {
    left: React.ReactNode;
    right?: React.ReactNode;
}) {

  return (
    <div className="flex justify-between items-center">
      <div className="basis-[300px]">
        {left}
      </div>
      {right &&
        (
          <div className="ml-auto">
            {right}
          </div>
        )
      }
    </div>
  )
}
