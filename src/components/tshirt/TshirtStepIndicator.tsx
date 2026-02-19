import { Shirt, CreditCard, Truck, Package, CheckCircle } from 'lucide-react';

interface TshirtStepIndicatorProps {
  step: number;
  onStepClick: (step: number) => void;
}

export default function TshirtStepIndicator({ step, onStepClick }: TshirtStepIndicatorProps) {
  const steps = [
    { icon: Shirt, label: 'Product' },
    { icon: CreditCard, label: 'Payment' },
    { icon: Truck, label: 'Delivery' },
    { icon: Package, label: 'Review' },
    { icon: CheckCircle, label: 'Complete' }
  ];

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6 lg:gap-8 mb-8 sm:mb-10">
      {steps.map((stepItem, index) => {
        const Icon = stepItem.icon;
        const isActive = step === index;
        const isCompleted = step > index;
        const canNavigate = step > index && index < 4;

        return (
          <div key={stepItem.label} className="contents">
            <div
              className={`flex flex-col items-center transition-all duration-500 ${canNavigate ? 'cursor-pointer hover:scale-105' : ''} ${isActive ? 'text-black scale-110' : 'text-gray-400'} min-w-0 flex-shrink-0`}
              onClick={() => canNavigate && onStepClick(index)}
            >
              <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-black text-js shadow-lg' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100'}`}>
                {isCompleted ? (
                  <CheckCircle size={16} className="sm:w-5 sm:h-5 animate-bounce" />
                ) : (
                  <Icon size={index === 4 ? 14 : 16} className="sm:w-4 sm:h-4" />
                )}
                {isActive && (
                  <div className="absolute -top-1 -right-1">
                    <span className="absolute inline-flex h-4 w-4 rounded-full bg-js opacity-75 animate-ping"></span>
                    <span className="relative inline-flex h-4 w-4 rounded-full bg-js"></span>
                  </div>
                )}
              </div>
              <span className="text-xs sm:text-sm mt-1 sm:mt-2 font-semibold text-center">{stepItem.label}</span>
            </div>

            {index < steps.length - 1 && (
              <div className={`relative h-1 w-4 sm:w-6 md:w-8 rounded-full transition-all duration-700 flex-1 max-w-[2rem] ${step > index ? 'bg-gradient-to-r from-black to-js' : 'bg-gray-200'}`}>
                {step > index && (
                  <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-js to-js-dark rounded-full animate-pulse"></div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
