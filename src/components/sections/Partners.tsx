import { motion } from 'framer-motion';
import Image from 'next/image';
import Button from '../ui/Button';

// Define TypeScript interfaces for partners data
interface Partner {
  id: string;
  name: string;
  logo: string;
  url: string;
}

// Props interface with optional styling properties
interface PartnersProps {
  partners: Partner[];
  titleClassName?: string;
}

export default function Partners({ partners, titleClassName = 'text-blue-700' }: PartnersProps) {
  if (!partners || partners.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className={`text-3xl font-bold mb-3 ${titleClassName}`}>
            Our Amazing Partners 🤝
          </h2>
          <p className="text-gray-800 max-w-2xl mx-auto">
            ZurichJS wouldn&apos;t be possible without the support of these incredible companies 
            that share our passion for the JavaScript community. They&apos;re helping us build something awesome! ✨
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 items-center justify-items-center mb-12"
        >
          {partners.map((partner) => (
            <motion.a
              key={partner.id}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-[150px] h-20 relative grayscale hover:grayscale-0 transition-all"
              aria-label={`Visit ${partner.name} website`}
            >
              <Image
                src={partner.logo}
                alt={`${partner.name} logo`}
                fill
                className="object-contain"
              />
            </motion.a>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Button 
            href="/partnerships" 
            variant="secondary"
          >
            Become a Partner 🚀
          </Button>
        </motion.div>
      </div>
    </section>
  );
}