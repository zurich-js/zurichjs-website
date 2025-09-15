import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import React from 'react';

import KitButton from "@/components/v2/kit/button/KitButton";
import KitList from "@/components/v2/kit/KitList";
import KitPill from "@/components/v2/kit/KitPill";
import { roundToNearestHalf } from '@/components/v2/kit/utils/discountOperations';

interface PricingHeader {
    title: string;
    quantity: number;
    price: number;
}
interface PricingDiscountRow {
    title: string;
    quantity: number;
    discount: number;
}

interface PricingSection {
  header: PricingHeader;
  discounts: PricingDiscountRow[];
}

export function WorkshopPricingHeader({
  title,
  quantity,
  price
}: {
  title: string;
  quantity: number;
  price: number;
}) {
  const total = price * quantity
  return (
        <div className="grid grid-cols-[3fr_40px_80px_80px] gap-2.5 pb-1 items-end text-kit-sm border-b border-kit-gray-medium">
          <h3 className="font-medium">{title}</h3>
          <p className="text-right">{quantity}x</p>
          <p className="text-right text-kit-base"><span className="text-kit-xs">CHF</span> {price}</p>
          <p className="text-right text-kit-base"><span className="text-kit-xs">CHF</span> {total}</p>
        </div>
    );
}

export function WorkshopPricingRow({
  title,
  quantity,
  discount,
  price
}: {
  title: string;
  quantity: number;
  discount: number;
  price: number;
}) {
  const displayDiscount = (() => {
    if (!discount) return null
    return '-' + discount + '%'
  })()

  return (
      <div className="grid grid-cols-[3fr_40px_80px_80px] gap-2.5 items-center">
        <p className="text-kit-sm text-kit-gray-dark">{title} discount
          <KitPill color="green" className="inline-block ml-1">
            {displayDiscount}
          </KitPill>
        </p>
        <p className="text-right">{quantity}x</p>
        <p className="text-right text-kit-base text-kit-green"><span className="text-kit-xs">CHF</span> { roundToNearestHalf((price * discount) / 100) }</p>
      </div>
  )
}

export function WorkshopPricingSubtotal({
  quantity,
  price,
  isFree = false,
}: {
  quantity: number;
  price: number;
  isFree?: boolean;
}) {
  return (
    <div className="grid grid-cols-[3fr_40px_80px_80px] gap-2.5 items-center text-kit-sm text-black">
      <p className="font-medium">Subtotal</p>
      <p className="text-right">{quantity}x</p>
      <p className="text-right text-kit-base">
        {isFree ? <span className="text-kit-green">FREE</span> : (
          <>
            <span className="text-kit-xs">CHF</span> { roundToNearestHalf(price) }
          </>
        )}
      </p>
      <p className="text-right text-kit-base">
        {isFree ? <span className="text-kit-green">FREE</span> : (
          <>
            <span className="text-kit-xs">CHF</span> { roundToNearestHalf(price * quantity) }
          </>
        )}
      </p>
    </div>
  )
}

export function WorkshopPricingSection({
  section,
    }: {
    section: PricingSection;
    }) {
    const { header, discounts } = section;

    // Calculate subtotal
    const basePrice = header.price || 0;
    const quantity = header.quantity;

    // Calculate total discount amount (cumulative)
    const totalDiscountAmount = discounts.reduce((sum, row) => {
      return sum + (basePrice * (row.discount || 0) / 100);
    }, 0);

    // Handle 100%+ discount - workshop becomes free
    const finalPricePerItem = Math.max(0, basePrice - totalDiscountAmount);
    const isFree = finalPricePerItem === 0 && totalDiscountAmount >= basePrice;

  return (
      <div className="flex flex-col gap-1">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <WorkshopPricingHeader title={header.title} price={basePrice} quantity={header.quantity} />
        </motion.div>

        <AnimatePresence>
          {discounts?.map((row, index) => (
            <motion.div
              key={`${row.title}-${index}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
                ease: [0.4, 0, 0.2, 1]
              }}
              className="overflow-hidden"
            >
              <WorkshopPricingRow price={basePrice} quantity={row.quantity} title={row.title} discount={row.discount} />
            </motion.div>
          ))}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
        >
          <WorkshopPricingSubtotal quantity={quantity} price={finalPricePerItem} isFree={isFree} />
        </motion.div>
      </div>
  );
  }

export function WorkshopPricingSummary({
  sections,
}: { sections: PricingSection[] }) {
  return (
    <div className="bg-white border-2 pb-4 border-kit-gray-medium rounded-lg overflow-hidden">
      <Disclosure defaultOpen={true}>
        {({ open }) => (
          <>
            {/* Summary Header */}
            <DisclosureButton className="relative flex items-center justify-between p-4 cursor-pointer group/control focus:outline-0 focus:ring-2 focus:ring-zurich ring-offset-0 w-[calc(100%-4px)] mx-auto">
              <div className="absolute pointer-events-none z-10 w-full top-0 -translate-y-full left-0 right-0 bottom-0 bg-gradient-to-b from-kit-gray-light to-white group-hover/control:translate-y-0 transition-transform duration-300 ease-in-out" />
              <h3 className="text-lg font-medium relative z-20">Summary</h3>
              <motion.div
                className="relative z-20"
                animate={{ rotate: open ? 0 : 180 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <ChevronUp size={20} />
              </motion.div>
            </DisclosureButton>

            <DisclosurePanel>
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: [0.4, 0, 0.2, 1],
                      opacity: { duration: 0.2 }
                    }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-6">
                      <AnimatePresence mode="popLayout">
                        {sections.map((section, index) => {
                          return (
                            <motion.div
                              key={`section-${section.header.title}-${index}`}
                              initial={{ opacity: 0, y: 10, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: "auto" }}
                              exit={{ opacity: 0, y: -10, height: 0 }}
                              transition={{
                                duration: 0.3,
                                delay: index * 0.1,
                                ease: [0.4, 0, 0.2, 1]
                              }}
                              className="overflow-hidden"
                            >
                              <WorkshopPricingSection section={section} />
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </DisclosurePanel>
          </>
        )}
      </Disclosure>
    </div>
  );
}

export function WorkshopPricingTotals({
  sections
}: { sections: PricingSection[] }) {
  // Calculate total cost and savings
  const totalCost = (() => {
    return sections.reduce((sectionSum, section) => {
      const header = section.header;
      const basePrice = header.price || 0;
      const quantity = header.quantity;

      // Calculate total discount amount (cumulative) - same logic as WorkshopPricingSection
      const totalDiscountAmount = section.discounts.reduce((sum, row) => {
        return sum + (basePrice * (row.discount || 0) / 100);
      }, 0);

      // Handle 100%+ discount - workshop becomes free
      const finalPricePerItem = Math.max(0, basePrice - totalDiscountAmount);
      return sectionSum + (finalPricePerItem * quantity);
    }, 0);
  })();

  const totalSavings = (() => {
    const totalWithoutDiscounts = sections.reduce((sum, section) => sum + (section.header.price * section.header.quantity), 0);
    return totalWithoutDiscounts - totalCost;
  })();

  // Handle division by zero when workshop is free
  const totalDiscountPercent = totalSavings > 0 && (totalCost + totalSavings) > 0
    ? roundToNearestHalf(((totalSavings / (totalCost + totalSavings)) * 100))
    : 0;

  const items = sections.map((section) => `${section.header.quantity} ${section.header.title}`)

  return (
    <motion.div
      className="relative flex flex-col px-4 py-5 pt-8 gap-5 -mt-[2px] border-2 border-kit-gray-medium rounded-lg bg-kit-gray-light"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="flex justify-between">
        <div>
          <motion.h3
            className="text-kit-md font-medium"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            Your cost
          </motion.h3>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <KitList
              items={items}
              listStyle="disc"
            />
          </motion.div>
        </div>
        <div className="space-y-4">
          <motion.p
            className="text-kit-2xl text-right"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
            key={totalCost} // Re-animate when total changes
          >
            {totalCost === 0 ? (
              <span className="text-kit-green">FREE</span>
            ) : (
              <>
                <span className="text-kit-xl">CHF </span>
                {roundToNearestHalf(totalCost)}
              </>
            )}
          </motion.p>
          {totalCost !== 0 && (
            <motion.p
              className="text-kit-green text-kit-md text-right"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              key={totalDiscountPercent}
            >
              <b>{totalDiscountPercent}%</b> discount, saving CHF <b>{roundToNearestHalf(totalSavings)}</b>
            </motion.p>
          )}
        </div>
      </div>
      <motion.div
        className="flex flex-col sm:flex-row gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <KitButton
          variant="black"
          className="basis-1/2"
        >
          Secure your spot
        </KitButton>
        <KitButton
          variant="white"
          className="basis-1/2"
        >
          Gift a ticket
        </KitButton>
      </motion.div>
      <div className="absolute -top-px -left-px -translate-x-1/2 -translate-y-1/2 size-10 rounded-full bg-white border-2 border-kit-gray-medium" />
      <div className="absolute -top-px -right-px translate-x-1/2 -translate-y-1/2 size-10 rounded-full bg-white border-2 border-kit-gray-medium" />
    </motion.div>
  )
}
