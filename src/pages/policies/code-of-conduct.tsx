import { motion } from 'framer-motion';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';

export default function CodeOfConduct() {
  return (
    <Layout>
      <SEO
        title="Code of Conduct | ZurichJS"
        description="ZurichJS code of conduct for ensuring a welcoming and inclusive environment at our events."
      />
      
      <Section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-black">Code of Conduct</h1>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Our Pledge</h2>
            <p className="mb-4 text-gray-800">
              ZurichJS is dedicated to providing a harassment-free and inclusive event experience for everyone regardless of gender identity and expression, sexual orientation, disability, physical appearance, body size, race, age, religion, or technology choices.
            </p>
            <p className="mb-4 text-gray-800">
              We do not tolerate harassment of event participants in any form and are committed to ensuring a welcoming environment for all attendees.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Expected Behavior</h2>
            <p className="mb-4 text-gray-800">
              We expect all participants to:
            </p>
            <ul className="list-disc ml-6 mb-4 text-gray-800">
              <li className="mb-2">Be respectful and considerate towards others.</li>
              <li className="mb-2">Refrain from demeaning, discriminatory, or harassing behavior and speech.</li>
              <li className="mb-2">Be mindful of your surroundings and of your fellow participants.</li>
              <li className="mb-2">Alert community organizers if you notice a dangerous situation, someone in distress, or violations of this Code of Conduct.</li>
              <li className="mb-2">Participate in an authentic and active way, contributing to the health and longevity of the community.</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Unacceptable Behavior</h2>
            <p className="mb-4 text-gray-800">
              Unacceptable behaviors include, but are not limited to:
            </p>
            <ul className="list-disc ml-6 mb-4 text-gray-800">
              <li className="mb-2">Harassment, intimidation, or discrimination in any form.</li>
              <li className="mb-2">Verbal, physical, or written abuse or threats.</li>
              <li className="mb-2">Offensive comments related to gender, gender identity and expression, sexual orientation, disability, mental illness, physical appearance, body size, race, religion, or socio-economic status.</li>
              <li className="mb-2">Unwelcome sexual attention, including sexualized comments, jokes, or imagery in talks, online communications, or in-person interactions.</li>
              <li className="mb-2">Deliberate intimidation, stalking, or following.</li>
              <li className="mb-2">Sustained disruption of talks or other events.</li>
              <li className="mb-2">Inappropriate physical contact without consent.</li>
              <li className="mb-2">Advocating for, or encouraging, any of the above behavior.</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Consequences of Unacceptable Behavior</h2>
            <p className="mb-4 text-gray-800">
              Unacceptable behavior from any community member, including sponsors and those with decision-making authority, will not be tolerated. Anyone asked to stop unacceptable behavior is expected to comply immediately.
            </p>
            <p className="mb-4 text-gray-800">
              If a community member engages in unacceptable behavior, the organizers may take any action they deem appropriate, up to and including a temporary ban or permanent expulsion from the community without warning and without refund.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Reporting Guidelines</h2>
            <p className="mb-4 text-gray-800">
              If you are subject to or witness unacceptable behavior, or have any other concerns, please notify an organizer as soon as possible by emailing hello@zurichjs.com or speaking directly with any ZurichJS team member at an event.
            </p>
            <p className="mb-4 text-gray-800">
              All complaints will be reviewed and investigated promptly and fairly. All community organizers are obligated to respect the privacy and security of the reporter of any incident.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Scope</h2>
            <p className="mb-4 text-gray-800">
              This Code of Conduct applies to all ZurichJS spaces and events, both online and off, including meetups, workshops, conferences, social media interactions, and any other venues used by our community. It applies to all community participants, including attendees, speakers, sponsors, volunteers, and organizers.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-js mb-8">
            <h2 className="text-xl font-bold mb-4 text-black">Contact Information</h2>
            <p className="mb-4 text-gray-800">
              If you have any questions about this Code of Conduct or need to report an incident, please contact us at:
            </p>
            <p className="mb-4 text-gray-800">
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