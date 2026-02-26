import Image from 'next/image';
import Link from 'next/link';

const RAFFLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfagfGCT9WqKSuUhepz3akRjRi0MH6RNq_ZTTenwBXi-flYYA/viewform?usp=header';

export default function SentryRaffle() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Image
          src="/images/partners/sentry.png"
          alt="Sentry logo"
          width={32}
          height={32}
          className="object-contain"
        />
        <h2 className="text-lg font-bold text-gray-900">
          Sentry Raffle
        </h2>
      </div>

      <p className="text-sm text-gray-600">
        Enter the raffle for a chance to win prizes from Sentry! Fill out the form below to participate.
      </p>

      <Link
        href={RAFFLE_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-[#362D59] text-white font-bold py-4 px-8 rounded-2xl text-center hover:bg-[#2b2347] transition-colors duration-200"
      >
        Enter the Raffle
      </Link>
    </div>
  );
}
