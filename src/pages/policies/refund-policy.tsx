import { motion } from 'framer-motion';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';

export default function RefundPolicy() {
  return (
    <Layout>
      <SEO
        title="Refund Policy | ZurichJS"
        description="ZurichJS refund policy for events and workshops."
      />
      
      <Section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-black">Refund Policy</h1>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Overview</h2>
            <p className="mb-4 text-gray-800">
              This refund policy outlines the terms under which the Swiss JavaScript Group, a registered non-profit association (Verein) in Switzerland, operating ZurichJS, may provide refunds for event tickets and workshops. 
              Our goal is to maintain a fair and transparent approach to refunds while ensuring the sustainability of our community events.
            </p>
            <p className="mb-4 text-gray-800">
              For the purposes of this policy, &quot;we,&quot; &quot;us,&quot; and &quot;our&quot; refer to the Swiss JavaScript Group and its ZurichJS operations.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Ticket Transfers</h2>
            <p className="mb-4 text-gray-800">
              While we do not offer refunds for purchased tickets, we understand that circumstances may change. If you&apos;re unable to attend an event or workshop:
            </p>
            <ul className="list-disc ml-6 mb-4 text-gray-800">
              <li className="mb-2">You may transfer your ticket to another person.</li>
              <li className="mb-2">To initiate a ticket transfer, please contact us at hello@zurichjs.com with the name and email of the person receiving the ticket.</li>
              <li className="mb-2">Ticket transfers must be requested at least 24 hours before the event.</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Exceptions for Refunds</h2>
            <p className="mb-4 text-gray-800">
              We may provide refunds in the following limited circumstances:
            </p>
            <ul className="list-disc ml-6 mb-4 text-gray-800">
              <li className="mb-2"><strong>Event Cancellation:</strong> If the Swiss JavaScript Group cancels an event or workshop, all attendees will receive a full refund.</li>
              <li className="mb-2"><strong>Date Changes:</strong> If the Swiss JavaScript Group changes the date of an event, and the new date doesn&apos;t work for you, you may request a refund.</li>
            </ul>
            <p className="mb-4 text-gray-800">
              To request a refund for these exceptions, please contact us at hello@zurichjs.com within 7 days of the cancellation or date change announcement.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Processing of Refunds</h2>
            <p className="mb-4 text-gray-800">
              When a refund is approved:
            </p>
            <ul className="list-disc ml-6 mb-4 text-gray-800">
              <li className="mb-2">Refunds will be processed through the original payment method used for the purchase.</li>
              <li className="mb-2">Please allow up to 10 business days for the refund to appear in your account.</li>
              <li className="mb-2">Processing fees or payment gateway charges may be deducted from the refund amount, depending on our payment processor&apos;s policies.</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Contact Information</h2>
            <p className="mb-4 text-gray-800">
              If you have any questions about our refund policy or need to request a ticket transfer or refund, please contact us at:
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