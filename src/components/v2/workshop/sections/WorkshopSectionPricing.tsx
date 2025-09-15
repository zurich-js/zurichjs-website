import {useUser} from "@clerk/nextjs";
import { motion } from "framer-motion";
import {Check, Plus} from "lucide-react";
import React from "react";

import KitButton from "@/components/v2/kit/button/KitButton";
import KitInputText from "@/components/v2/kit/inputs/KitInputText";
import KitSelect from "@/components/v2/kit/inputs/KitSelect";
import KitList from "@/components/v2/kit/KitList";
import KitPill from "@/components/v2/kit/KitPill";
import {getActivePricingPhase, PricingConfig} from "@/components/v2/kit/utils/dateOperations";
import {calculateCouponDiscount} from "@/components/v2/kit/utils/discountOperations";
import WorkshopPricingExpiration from "@/components/v2/workshop/sections/pricing/WorkshopPricingExpiration";
import WorkshopPricingItemRow from "@/components/v2/workshop/sections/pricing/WorkshopPricingItemRow";
import WorkshopPricingItemTitle from "@/components/v2/workshop/sections/pricing/WorkshopPricingItemTitle";
import {WorkshopPricingSummary, WorkshopPricingTotals} from "@/components/v2/workshop/sections/pricing/WorkshopPricingSummary";
import WorkshopSection from "@/components/v2/workshop/WorkshopSection";
import CancelledCheckout from "@/components/workshop/CancelledCheckout";
import {useCouponEnhanced} from "@/hooks/useCouponEnhanced";

export interface WorkshopSectionPricingProps {
  workshop: {
    title: string;
    id: string;
  }
  discountFlags: {
    phaseExpiry?: boolean;
    groupDiscount?: boolean;
    voucherDiscount?: boolean;
    tshirtVoucherDiscount?: boolean;
    tshirtBundleDiscount?: boolean;
    tshirtQuantityDiscount?: boolean;
    // todo decide whether to include thresholds for qty-based discounts
  };
  prices: {
    basePrice: number;
    canBeGifted: boolean;
    tshirts: {
      price: number;
      stock: [{ size: string; quantity: number }] | null;
    }
    phases: {
      date: string; // YYYY-MM-DD - EXPIRATION date
      time: string; // HH:MM - EXPIRATION time
      title: string; // e.g. "Early Bird"
      discount: number; // percentage discount, e.g. 20
    }[],
  },
  discounts: {
    workshopGroup: number | Record<number, number>;
    tshirtBundle: number
    tshirtQuantity: number
  },
  seats: {
    max: number;
    remaining: number;
  }
  currentPricing?: PricingConfig;
}

export default function WorkshopSectionPricing(props: WorkshopSectionPricingProps) {
  const { workshop, discountFlags, prices, discounts, seats } = props;

  const { user } = useUser();
  const [ticketsOrder, setTicketsOrder] = React.useState(1);
  const [tshirtsOrder, setTshirtsOrder] = React.useState<{ size: string; quantity: number }[]>([]);

  const {
    couponCode,
    setCouponCode,
    applyCoupon,
    isCouponApplied,
    isCouponCodeValid,
    handleKeyPress,
    couponDetails,
    isLoadingCoupon,
    couponError,
    couponStatusText,
    isFreeWorkshop,
    isSingleUseCoupon
  } = useCouponEnhanced({ workshopId: workshop.id, workshopTitle: workshop.title });
  const currentPricingTier = props.currentPricing || getActivePricingPhase(prices.phases);

  const allowedTshirtSizes = prices.tshirts?.stock ? prices.tshirts.stock.filter(t => t.quantity > 0).map(t => t.size) : [];
  const firstTshirtSizeThatIsntAddedYet = allowedTshirtSizes.find(size => !tshirtsOrder.find(t => t.size === size)) || 'S';

  const handleTshirtQuantityChange = React.useCallback((index: number) => (v: string) => {
    const newQty = parseInt(v) || 1;
    setTshirtsOrder(prev => prev.map((t, i) =>
      i === index ? { ...t, quantity: newQty } : t
    ));
  }, []);
  const handleTshirtSizeChange = React.useCallback((index: number) => (v: string) => {
    setTshirtsOrder(prev => prev.map((t, i) =>
      i === index ? { ...t, size: v } : t
    ));
  }, []);
  const totalTshirtQuantity = tshirtsOrder.reduce((sum, t) => sum + t.quantity, 0);


  const couponDiscountInfo = calculateCouponDiscount(couponDetails);

  function getThresholdDiscount(ticketsOrder: number, thresholds: number | Record<number, number>) {
    if (typeof thresholds === 'number') return thresholds;
    const sortedThresholds = Object.keys(thresholds).map(k => parseInt(k)).sort((a, b) => b - a);
    for (const threshold of sortedThresholds) {
      if (ticketsOrder >= threshold) {
        return thresholds[threshold];
      }
    }
    return 0;
  }

  const ticketGroupDiscount = discountFlags.groupDiscount && ticketsOrder > 1 ? getThresholdDiscount(ticketsOrder, discounts.workshopGroup) : 0;
  const tshirtQuantityDiscount = discountFlags.tshirtQuantityDiscount && totalTshirtQuantity > 1 ? getThresholdDiscount(totalTshirtQuantity, discounts.tshirtQuantity) : 0;


  const pricingSections = [
    {
      header: {
        title: "Workshop tickets",
        quantity: ticketsOrder,
        price: prices.basePrice
      },
      discounts: [
        ...(!!currentPricingTier?.discount ? [{ // if the current pricing period is discounted
          title: currentPricingTier.title,
          quantity: ticketsOrder,
          discount: currentPricingTier.discount
        }] : []),
        ...(discountFlags.voucherDiscount && !!couponDiscountInfo.percent ? [{
          title: "Voucher",
          quantity: ticketsOrder,
          discount: couponDiscountInfo.percent
        }] : []),
        ...(discountFlags.groupDiscount && ticketsOrder > 1 ? [{
          title: "Group",
          quantity: ticketsOrder,
          discount: ticketGroupDiscount
        }] : [])
      ]
    },
    ...(prices.tshirts && tshirtsOrder.length > 0 ? [{
      header: {
        title: "T-Shirts",
        quantity: totalTshirtQuantity,
        price: prices.tshirts.price
      },
      discounts: [
        ...(discountFlags.tshirtBundleDiscount && ticketsOrder >= 1 ? [{
          title: "Workshop bundle",
          quantity: totalTshirtQuantity,
          discount: discounts.tshirtBundle //TSHIRT_BUNDLE_DISCOUNT
        }] : []),
        // TODO handle couponDiscountInfo.amount cases where you have e.g. 50CHF off.
        // shared pool with the rest of the order i.e. workshop + tshift or just workshop and so on.
        ...(discountFlags.tshirtVoucherDiscount && !!couponDiscountInfo.percent ? [{
          title: "Voucher",
          quantity: totalTshirtQuantity,
          discount: couponDiscountInfo.percent
        }] : []),
        ...(discountFlags.tshirtQuantityDiscount && totalTshirtQuantity > 1 ? [{
          title: "Quantity",
          quantity: totalTshirtQuantity,
          discount: tshirtQuantityDiscount
        }] : [])
      ]
    }] : [])
  ]

  const tshirtSelectOptions = allowedTshirtSizes.map(size => ({ value: size, label: size }));

  return (
    <WorkshopSection
      slug="pricing-and-registration"
      title="Pricing and Registration"
      layout="section"
      titleChildren={seats?.remaining && (
        <KitPill color="orange" className="text-xs mt-2 w-fit">{seats.remaining} seats left</KitPill>
      )}
    >
      {!currentPricingTier ? (
        <p>Pricing info is disabled at the moment</p>
      ) : (
        <div className="space-y-8 pt-4">
          <CancelledCheckout workshopId={workshop.id} workshopTitle={workshop.title} />
          <div className="space-y-4">
            {discountFlags.phaseExpiry && (
              <WorkshopPricingItemRow>
                <WorkshopPricingItemTitle
                  title={currentPricingTier.title}
                  discount={currentPricingTier.discount}
                >
                  Limited time
                </WorkshopPricingItemTitle>
                <WorkshopPricingExpiration
                  date={currentPricingTier.date}
                  time={currentPricingTier.time}
                />
              </WorkshopPricingItemRow>
            )}

            <WorkshopPricingItemRow>
              <WorkshopPricingItemTitle
                title="Voucher"
                discount={couponDiscountInfo.percent || undefined}
              >
                {couponStatusText || (user ? '' : 'Sign in for community discount')}
              </WorkshopPricingItemTitle>
              <div className="grid grid-cols-[1fr_120px] gap-1">
                <div className="min-w-[200px] relative">
                  <KitInputText
                    value={couponCode}
                    onChange={setCouponCode}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter coupon code..."
                    className="w-full"
                    extra={couponError && (
                      <div className="text-red-500 text-xs mt-1">{couponError}</div>
                    )}
                  >
                    {isCouponApplied && isCouponCodeValid && (
                      <Check size={16} className="absolute z-20 pointer-events-none right-3 top-3.5 text-green-500" style={{ opacity: isCouponApplied ? 1 : 0 }} />
                    )}
                  </KitInputText>
                </div>
                <KitButton
                  variant="white"
                  className="w-full"
                  onClick={applyCoupon}
                  disabled={!isCouponCodeValid || isLoadingCoupon}
                >
                  {isLoadingCoupon ? '...' : 'Apply code'}
                </KitButton>
              </div>
            </WorkshopPricingItemRow>

            {discountFlags.groupDiscount && (
              <WorkshopPricingItemRow>
                <WorkshopPricingItemTitle title="How many tickets?" discount={ticketGroupDiscount}>
                  Group discount
                </WorkshopPricingItemTitle>
                <div className="flex flex-col items-end gap-1">
                  <KitInputText
                    type="number"
                    value={ticketsOrder}
                    min={1}
                    max={10}
                    onChange={(e) => setTicketsOrder(parseInt(e) || 1)}
                    className="w-[120px]"
                    disabled={isFreeWorkshop && isSingleUseCoupon}
                  />
                  {
                    typeof discounts.workshopGroup !== 'number' && Object.keys(discounts.workshopGroup).map(k => parseInt(k)).sort((a, b) => a - b).find(t => t > ticketsOrder && t - ticketsOrder === 1) ? (
                      <motion.p
                        className="text-kit-xs text-kit-gray-dark"
                        initial={{opacity: 0, y: -50, scale: 0.9}}
                        animate={{opacity: 1, y: 0, scale: 1}}
                        exit={{opacity: 0, y: -50, scale: 0.9}}
                      >
                        Add one more ticket for only CHF {prices.basePrice * (1 - ((currentPricingTier.discount + (isCouponApplied && isCouponCodeValid && couponDiscountInfo.percent ? couponDiscountInfo.percent : 0) + getThresholdDiscount(ticketsOrder + 1, discounts.workshopGroup))/100))}!
                      </motion.p>
                    ) : null
                  }
                  {isFreeWorkshop && isSingleUseCoupon && (
                    <p className="text-kit-xs text-kit-green">
                      Single-use coupon
                    </p>
                  )}
                </div>
              </WorkshopPricingItemRow>
            )}

            <WorkshopPricingItemRow>
              <WorkshopPricingItemTitle title="Includes">
                <KitList
                  className="list-disc list-inside text-kit-sm"
                  listStyle="check"
                  items={[
                    '2.5 hours of hands-on training',
                    'In-person Q&A with Cloudflare expert',
                    'Snacks an Refreshments',
                    'Workshop materials'
                  ]}
                />
              </WorkshopPricingItemTitle>
            </WorkshopPricingItemRow>

            <WorkshopPricingItemRow>
              <WorkshopPricingItemTitle title="Want to represent?" discount={discounts?.tshirtBundle}>
                <p>
                  Throw in a discounted T-shirt
                </p>
                <div className="mt-2 grid grid-cols-3 justify-start gap-2 w-fit">
                  <div className="size-10 bg-kit-gray-medium rounded-md"></div>
                  <div className="size-10 bg-kit-gray-medium rounded-md"></div>
                  <div className="size-10 bg-kit-gray-medium rounded-md"></div>
                </div>
              </WorkshopPricingItemTitle>
              <div className="space-y-1">
                {tshirtsOrder.map((tshirt, index) => (
                  <div className="grid grid-cols-[1fr_1fr_120px] gap-1" key={`tshirt-${index}`}>
                    <KitInputText
                      type="number"
                      value={tshirt.quantity}
                      onChange={handleTshirtQuantityChange(index)}
                      className="w-[120px]"
                      valueTransform={(v) => v + ` x CHF ${prices.tshirts.price * ((100 - discounts?.tshirtBundle)/100)}`}
                    />
                    <KitSelect
                      defaultValue={{ value: tshirt.size, label: tshirt.size }}
                      options={tshirtSelectOptions}
                      onChange={handleTshirtSizeChange(index)}
                      valueTransform={(v) => `Size: ${v}`}
                    />
                    <KitButton
                      variant="white"
                      className="w-full"
                      onClick={() => setTshirtsOrder(prev => prev.filter((_, i) => i !== index))}
                    >
                      Remove
                    </KitButton>
                  </div>
                ))}
                {!!firstTshirtSizeThatIsntAddedYet &&
                  <div className="flex justify-end">
                    <KitButton
                      variant="ghost"
                      onClick={() => setTshirtsOrder(p => [...p, { size: firstTshirtSizeThatIsntAddedYet, quantity: 1}])}
                      lucideIcon={Plus}
                    >
                      Add {!!tshirtsOrder.length ? ' another' : ''}
                    </KitButton>
                  </div>
                }
              </div>
            </WorkshopPricingItemRow>

          </div>
          <div className="overflow-hidden">
            <WorkshopPricingSummary sections={pricingSections} />
            <WorkshopPricingTotals sections={pricingSections} />
            <ul className="list-disc list-inside mt-4 text-kit-sm">
              <li>Curious about our <a href="/policies/refund-policy" target="_blank">Refund policy?</a></li>
              <li>Need assistance or sponsorship? <a href="mailto:hello@zurichjs.com">Reach out to us</a>, we&#39;re happy to help!</li>
            </ul>
          </div>
        </div>
      )}
    </WorkshopSection>
  )
}
