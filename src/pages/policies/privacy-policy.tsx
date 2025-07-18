import { motion } from 'framer-motion';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';

export default function PrivacyPolicy() {
  return (
    <Layout>
      <SEO
        title="Privacy Policy | ZurichJS"
        description="ZurichJS privacy policy explaining how we collect, use, and protect your data."
      />
      
      <Section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-black">Privacy Policy</h1>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Introduction</h2>
            <p className="mb-4 text-gray-800">
              The Swiss JavaScript Group, a registered non-profit association (Verein) in Switzerland, operating ZurichJS, respects your privacy and is committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and attend our events, and tell you about your privacy rights.
            </p>
            <p className="mb-4 text-gray-800">
              For the purposes of this privacy policy, &quot;we,&quot; &quot;us,&quot; and &quot;our&quot; refer to the Swiss JavaScript Group and its ZurichJS operations.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Information We Collect</h2>
            <p className="mb-4 text-gray-800">
              We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
            </p>
            <ul className="list-disc ml-6 mb-4 text-gray-800">
              <li className="mb-2"><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
              <li className="mb-2"><strong>Contact Data</strong> includes email address and telephone numbers.</li>
              <li className="mb-2"><strong>Technical Data</strong> includes internet protocol (IP) address, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
              <li className="mb-2"><strong>Usage Data</strong> includes information about how you use our website and services.</li>
              <li className="mb-2"><strong>Event Data</strong> includes details about your registration and attendance at our events.</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">How We Use Your Information</h2>
            <p className="mb-4 text-gray-800">
              We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
            </p>
            <ul className="list-disc ml-6 mb-4 text-gray-800">
              <li className="mb-2">To register you as an attendee for our events.</li>
              <li className="mb-2">To provide you with information about upcoming events and content that may be of interest to you.</li>
              <li className="mb-2">To manage our relationship with you, including notifying you about changes to our terms or privacy policy.</li>
              <li className="mb-2">To improve our website, products/services, marketing, and your experience.</li>
              <li className="mb-2">To administer and protect our organization and website.</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Data Security</h2>
            <p className="mb-4 text-gray-800">
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. We limit access to your personal data to those who have a business need to know.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Data Retention</h2>
            <p className="mb-4 text-gray-800">
              We will only retain your personal data for as long as reasonably necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, regulatory, tax, accounting or reporting requirements.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Your Legal Rights</h2>
            <p className="mb-4 text-gray-800">
              Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:
            </p>
            <ul className="list-disc ml-6 mb-4 text-gray-800">
              <li className="mb-2">Request access to your personal data.</li>
              <li className="mb-2">Request correction of your personal data.</li>
              <li className="mb-2">Request erasure of your personal data.</li>
              <li className="mb-2">Object to processing of your personal data.</li>
              <li className="mb-2">Request restriction of processing your personal data.</li>
              <li className="mb-2">Request transfer of your personal data.</li>
              <li className="mb-2">Right to withdraw consent.</li>
            </ul>
            <p className="mb-4 text-gray-800">
              If you wish to exercise any of these rights, please contact us at hello@zurichjs.com.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Contact Information</h2>
            <p className="mb-4 text-gray-800">
              If you have any questions about this privacy policy or our privacy practices, please contact us at:
            </p>
            <p className="mb-4 text-gray-800">
              <strong>Swiss JavaScript Group</strong> (ZurichJS Operations)<br />
              <strong>Email:</strong> hello@zurichjs.com
            </p>
            <p className="mb-4 text-gray-800">
              As a registered non-profit association in Switzerland, we are committed to handling your data in accordance with Swiss data protection laws and European GDPR standards.
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