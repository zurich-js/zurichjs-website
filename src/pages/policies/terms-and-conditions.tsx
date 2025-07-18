import { motion } from 'framer-motion';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';

export default function TermsAndConditions() {
  return (
    <Layout>
      <SEO
        title="Terms and Conditions | ZurichJS"
        description="ZurichJS terms and conditions for website use and event participation."
      />
      
      <Section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-black">Terms and Conditions</h1>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">1. Introduction</h2>
            <p className="mb-4 text-gray-800">
              Welcome to ZurichJS, operated by the Swiss JavaScript Group, a registered non-profit association (Verein) in Switzerland. These Terms and Conditions govern your use of our website and participation in our events. By accessing our website or attending our events, you agree to these terms.
            </p>
            <p className="mb-4 text-gray-800">
              For the purposes of these terms, &quot;we,&quot; &quot;us,&quot; and &quot;our&quot; refer to the Swiss JavaScript Group and its ZurichJS operations.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">2. Website Use</h2>
            <p className="mb-4 text-gray-800">
              The content on our website is for general information and use only. It is subject to change without notice. We do not guarantee that our website, or any content on it, will always be available or be uninterrupted.
            </p>
            <p className="mb-4 text-gray-800">
              You are responsible for ensuring that all persons who access our website through your internet connection are aware of these terms and conditions and that they comply with them.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">3. Event Registration and Participation</h2>
            <p className="mb-4 text-gray-800">
              When you register for our events:
            </p>
            <ul className="list-disc ml-6 mb-4 text-gray-800">
              <li className="mb-2">You agree to provide accurate information about yourself.</li>
              <li className="mb-2">You agree to comply with our Code of Conduct during all ZurichJS events.</li>
              <li className="mb-2">You understand that tickets are non-refundable except in specific circumstances outlined in our Refund Policy.</li>
              <li className="mb-2">You agree that we may use photographs or videos taken during events for promotional purposes.</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">4. Intellectual Property</h2>
            <p className="mb-4 text-gray-800">
              The content on our website, including text, graphics, logos, and images, is the property of ZurichJS or our content suppliers and is protected by intellectual property laws.
            </p>
            <p className="mb-4 text-gray-800">
              You may print or download content from our website for your personal, non-commercial use, but you must not modify, reproduce, distribute, or use any content for commercial purposes without our permission.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">5. Limitation of Liability</h2>
            <p className="mb-4 text-gray-800">
              ZurichJS shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of your access to, or use of, our website or participation in our events.
            </p>
            <p className="mb-4 text-gray-800">
              We do not guarantee that the website will be secure or free from bugs or viruses. You are responsible for configuring your technology to access our website and should use your own virus protection software.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">6. Changes to Terms</h2>
            <p className="mb-4 text-gray-800">
              We may revise these terms at any time by amending this page. Please check this page regularly to take notice of any changes we made, as they are binding on you.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">7. Contact Information</h2>
            <p className="mb-4 text-gray-800">
              If you have any questions about these terms and conditions, please contact us at:
            </p>
            <p className="mb-4 text-gray-800">
              <strong>Swiss JavaScript Group</strong> (ZurichJS Operations)<br />
              <strong>Email:</strong> hello@zurichjs.com
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 italic">
            <p>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </motion.div>
      </Section>
    </Layout>
  );
} 