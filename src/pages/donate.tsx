import { motion } from 'framer-motion';
import { Heart, Coins } from 'lucide-react';
import Head from 'next/head';
import Image from 'next/image';

import Layout from '@/components/layout/Layout';

export default function DonatePage() {
  return (
    <>
      <Head>
        <title>Donate - ZurichJS</title>
        <meta name="description" content="Support ZurichJS with a donation" />
      </Head>
      
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-js to-js-dark flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 text-center"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
                className="inline-block text-6xl mb-4"
              >
                💛
              </motion.div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Support ZurichJS
              </h1>
              
              <p className="text-lg text-gray-600 mb-8">
                Thank you for considering a donation! Your support helps us keep the community thriving.
              </p>

              {/* TWINT QR Code */}
              <div className="mb-8 flex flex-col items-center">
                <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-100 mb-4">
                  <Image
                    src="/images/twint-code.jpg"
                    alt="TWINT Donation QR Code"
                    width={300}
                    height={300}
                    className="rounded-lg"
                    priority
                  />
                </div>
                <div className="flex items-center gap-2 text-gray-700 mb-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <span className="font-medium">Scan with TWINT to donate</span>
                </div>
              </div>

              {/* Cash donation message */}
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6 border-2 border-yellow-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Coins className="w-6 h-6 text-amber-600" />
                  <h3 className="text-xl font-bold text-gray-900">Feed the Box!</h3>
                </div>
                <p className="text-gray-700">
                  Prefer cash? Drop your donation in our community box at the next meetup.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </Layout>
    </>
  );
}