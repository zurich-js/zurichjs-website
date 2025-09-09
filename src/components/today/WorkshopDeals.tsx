import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface WorkshopInstructor {
  id: string;
  name: string;
  title: string;
  image: string;
}

interface WorkshopDeal {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  dateInfo: string;
  timeInfo: string;
  locationInfo: string;
  maxAttendees: number;
  workshopHref: string;
  couponCode: string;
  discount: string;
  discountPercentage: number;
  tag: string;
  iconColor: string;
  image?: string;
  expiresAt?: Date;
  instructors: WorkshopInstructor[];
}

interface WorkshopDealsProps {
  deals: WorkshopDeal[];
}

function DealCountdown({ expiresAt }: { expiresAt?: Date }) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, expired: false });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !expiresAt) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = expiresAt.getTime();
      const difference = expiry - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        return { hours, minutes, seconds, expired: false };
      } else {
        return { hours: 0, minutes: 0, seconds: 0, expired: true };
      }
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, mounted]);

  if (!mounted || !expiresAt) {
    return null;
  }

  if (timeLeft.expired) {
    return (
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-300 rounded-lg p-3">
        <div className="text-center">
          <div className="text-sm font-bold text-gray-600">💔 Deal Expired</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-js/10 to-yellow-50 border border-js rounded-lg p-3">
      <div className="text-center">
        <div className="text-xs font-bold text-black mb-2">⏰ DEAL ENDS IN</div>
        <div className="flex justify-center gap-2">
          <div className="bg-js text-black rounded-lg px-3 py-2 min-w-[45px] shadow-sm">
            <div className="font-black text-sm">{timeLeft.hours}</div>
            <div className="text-[10px] font-bold opacity-80">HOURS</div>
          </div>
          <div className="bg-js text-black rounded-lg px-3 py-2 min-w-[45px] shadow-sm">
            <div className="font-black text-sm">{timeLeft.minutes}</div>
            <div className="text-[10px] font-bold opacity-80">MINS</div>
          </div>
          <div className="bg-js text-black rounded-lg px-3 py-2 min-w-[45px] shadow-sm">
            <div className="font-black text-sm">{timeLeft.seconds}</div>
            <div className="text-[10px] font-bold opacity-80">SECS</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkshopDealCard({ deal }: { deal: WorkshopDeal }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Deal Badge */}
      <div className="absolute top-3 right-3 z-20 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg border-2 border-white">
        🔥 {deal.discount} OFF
      </div>

      <Link href={`${deal.workshopHref}?coupon=${deal.couponCode}`} className="flex flex-col h-full">
        {/* Workshop Image/Icon */}
        <div className="relative h-32 sm:h-36 overflow-hidden">
          <div
            className={`w-full h-full transition-transform duration-500 ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-[1]"></div>
            {deal.image ? (
              <Image 
                src={deal.image}
                alt={deal.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: deal.iconColor }}
              >
                <div className="text-center text-white p-4">
                  <div className="text-3xl mb-2">{deal.tag.split(' ')[0]}</div>
                  <div className="text-sm font-semibold opacity-90">
                    {deal.tag.substring(deal.tag.indexOf(' ') + 1)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Workshop Details */}
        <div className="p-3 sm:p-4 flex flex-col flex-grow">
          {/* Title & Subtitle */}
          <div className="mb-2">
            <h3 className="text-base sm:text-lg font-bold mb-1 text-gray-900 line-clamp-2">{deal.title}</h3>
            <p className="text-xs sm:text-sm text-gray-600 font-medium line-clamp-1">{deal.subtitle}</p>
          </div>

          {/* Workshop Meta */}
          <div className="grid grid-cols-2 gap-1 mb-2">
            <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg text-xs border border-gray-100">
              <Calendar size={12} className="mr-1.5 text-yellow-600 flex-shrink-0" />
              <span className="text-gray-700 truncate">{deal.dateInfo}</span>
            </div>
            <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg text-xs border border-gray-100">
              <Clock size={12} className="mr-1.5 text-yellow-600 flex-shrink-0" />
              <span className="text-gray-700 truncate">{deal.timeInfo}</span>
            </div>
            <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg text-xs border border-gray-100">
              <MapPin size={12} className="mr-1.5 text-yellow-600 flex-shrink-0" />
              <span className="text-gray-700 truncate">{deal.locationInfo}</span>
            </div>
            <div className="flex items-center bg-gray-50 px-2 py-1.5 rounded-lg text-xs border border-gray-100">
              <Users size={12} className="mr-1.5 text-yellow-600 flex-shrink-0" />
              <span className="text-gray-700 truncate">Max {deal.maxAttendees}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2 flex-grow">
            {deal.description}
          </p>

          {/* Instructor Section */}
          {deal.instructors && deal.instructors.length > 0 && (
            <div className="border-t border-gray-100 pt-2 mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {deal.instructors.length === 1 ? (
                    <>
                      <div className="relative mr-2 w-6 h-6 overflow-hidden rounded-full border border-gray-200">
                        <Image
                          src={`${deal.instructors[0].image}?h=50`}
                          alt={deal.instructors[0].name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-gray-900">{deal.instructors[0].name}</span>
                        <span className="text-[10px] text-gray-500">Instructor</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex -space-x-1 mr-2">
                        {deal.instructors.slice(0, 2).map((instructor) => (
                          <div key={instructor.id} className="relative w-6 h-6 overflow-hidden rounded-full border border-gray-200 bg-white">
                            <Image
                              src={`${instructor.image}?h=50`}
                              alt={instructor.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                        {deal.instructors.length > 2 && (
                          <div className="relative w-6 h-6 overflow-hidden rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-gray-600">+{deal.instructors.length - 2}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-gray-900">
                          {deal.instructors.map((i) => i.name.split(' ')[0]).join(', ')}
                        </span>
                        <span className="text-[10px] text-gray-500">Instructors</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Auto Applied Notice */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-2 mb-2">
            <div className="text-center">
              <div className="text-xs font-bold text-green-800">✨ Discount Auto Applied</div>
            </div>
          </div>

          {/* Countdown Timer */}
          {deal.expiresAt && (
            <div className="mb-2">
              <DealCountdown expiresAt={deal.expiresAt} />
            </div>
          )}

          {/* CTA Button */}
          <div className="mt-auto">
            <div className={`w-full bg-zurich hover:bg-zurich/90 text-white py-2.5 px-4 rounded-lg font-bold text-sm text-center transition-all duration-200 shadow-lg hover:shadow-xl ${
              isHovered ? 'transform scale-105' : ''
            }`}>
              💎 GET {deal.discount} OFF NOW!
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function WorkshopDeals({ deals }: WorkshopDealsProps) {
  if (!deals || deals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-full font-black text-sm shadow-lg">
          🔥 DEALS OF THE DAY 🔥
        </div>
        <p className="text-xs text-gray-600 mt-1">Limited time offers on our premium workshops</p>
      </div>

      {/* Workshop Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {deals.map((deal) => (
          <WorkshopDealCard key={deal.id} deal={deal} />
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
        🎯 Hurry! These exclusive deals won&apos;t last long.
      </div>
    </div>
  );
}