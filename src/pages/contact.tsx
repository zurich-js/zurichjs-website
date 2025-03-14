import Image from 'next/image';
import { motion } from 'framer-motion';
import { Mail, Linkedin, MessageSquare, Users } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import SEO from '@/components/SEO';
import Link from 'next/link';

// Define our TypeScript interfaces
interface ContactPerson {
  id: string;
  name: string;
  role: string;
  image: string;
  bio: string;
  email?: string;
  linkedin?: string;
}

interface ContactPageProps {
  contactPeople: ContactPerson[];
}

export default function Contact({ contactPeople }: ContactPageProps) {
  return (
    <Layout>
      <SEO 
        title="Contact ZurichJS | JavaScript Community in Zurich"
        description="Get in touch with the ZurichJS team - we're happy to answer your questions about our JavaScript community in Zurich."
        openGraph={{
          title: "Contact ZurichJS | JavaScript Community in Zurich",
          description: "Get in touch with the ZurichJS team - we're happy to answer your questions about our JavaScript community in Zurich.",
          image: "/images/community/pic-1.png",
          type: "website"
        }}
      />

      <div className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-yellow-400 to-amber-500 py-16">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
                Get in Touch 👋
              </h1>
              <p className="text-xl mb-6 text-gray-900 max-w-3xl mx-auto">
                Have questions about ZurichJS? Want to speak at one of our events? Looking to sponsor or collaborate? We&apos;d love to hear from you!
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact Options */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3 text-gray-900">How to Reach Us 📬</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                Choose the way that works best for you to connect with our JavaScript community.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-gray-50 p-8 rounded-lg shadow-md text-center"
              >
                <div className="bg-blue-700 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Mail size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Email Us</h3>
                <p className="text-gray-700 mb-4">
                  Send us an email and we&apos;ll get back to you as soon as possible.
                </p>
                <a 
                  href="mailto:hello@zurichjs.com" 
                  className="text-blue-700 font-medium hover:underline"
                >
                  hello@zurichjs.com
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-50 p-8 rounded-lg shadow-md text-center"
              >
                <div className="bg-blue-700 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Linkedin size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">LinkedIn</h3>
                <p className="text-gray-700 mb-4">
                  Connect with us on LinkedIn for updates and networking opportunities.
                </p>
                <a 
                  href="https://www.linkedin.com/company/zurichjs" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 font-medium hover:underline"
                >
                  linkedin.com/company/zurichjs
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-gray-50 p-8 rounded-lg shadow-md text-center"
              >
                <div className="bg-blue-700 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Meetup</h3>
                <p className="text-gray-700 mb-4">
                  Join our Meetup group to attend events and message us directly.
                </p>
                <a 
                  href="https://meetup.com/zurich-js" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 font-medium hover:underline"
                >
                  meetup.com/zurich-js
                </a>
              </motion.div>
            </div>

            {/* Contact People */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3 text-gray-900">Meet Our Organizers 👥</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                Feel free to reach out directly to our team members for specific inquiries.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {contactPeople.map((person, index) => (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-gray-50 rounded-lg overflow-hidden shadow-md flex flex-col md:flex-row"
                >
                  <div className="relative h-64 md:h-auto md:w-1/3">
                    <Image
                      src={person.image}
                      alt={person.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6 md:w-2/3">
                    <h3 className="text-xl font-bold mb-1 text-gray-900">{person.name}</h3>
                    <p className="text-blue-700 mb-4">{person.role}</p>
                    <p className="text-gray-700 mb-4">{person.bio}</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {person.email && (
                        <a 
                          href={`mailto:${person.email}`}
                          className="flex items-center gap-2 text-gray-700 hover:text-blue-700"
                        >
                          <Mail size={18} />
                          <span>{person.email}</span>
                        </a>
                      )}
                      {person.linkedin && (
                        <a 
                          href={person.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-gray-700 hover:text-blue-700"
                        >
                          <Linkedin size={18} />
                          <span>LinkedIn Profile</span>
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3 text-gray-900">Frequently Asked Questions 🤔</h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                Quick answers to common questions about ZurichJS.
              </p>
            </motion.div>

            <div className="max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-6 bg-white p-6 rounded-lg shadow-sm"
              >
                <h3 className="text-lg font-bold mb-2 text-gray-900">How can I speak at a ZurichJS event?</h3>
                <p className="text-gray-700">
                  We&apos;re always looking for speakers! You can apply directly through our Call for Papers <Link href="/cfp" className="text-blue-700 hover:underline">here</Link>. First-time speakers are absolutely welcome - we can help train you and provide guidance on public speaking. If you have questions about the process, feel free to reach out to us on <a href="https://www.linkedin.com/company/zurichjs" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">LinkedIn</a>.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-6 bg-white p-6 rounded-lg shadow-sm"
              >
                <h3 className="text-lg font-bold mb-2 text-gray-900">Can my company sponsor or host a ZurichJS event?</h3>
                <p className="text-gray-700">
                  Absolutely! We&apos;re always looking for venues and sponsors. Please contact us to discuss how we can collaborate to create an amazing event for the JavaScript community. Check out our <Link href="/partnerships" className="text-blue-700 hover:underline">partnerships page</Link> to find out more.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mb-6 bg-white p-6 rounded-lg shadow-sm"
              >
                <h3 className="text-lg font-bold mb-2 text-gray-900">How can I get involved with the ZurichJS community?</h3>
                <p className="text-gray-700">
                  Start by joining our Meetup group and attending events! Bring your energy and enthusiasm to our meetups. If you want to volunteer and help organize events, create content, or contribute in other ways, reach out to us on <a href="https://www.linkedin.com/company/zurichjs" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">LinkedIn</a> - we&apos;d love to have your support.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mb-6 bg-white p-6 rounded-lg shadow-sm"
              >
                <h3 className="text-lg font-bold mb-2 text-gray-900">Are ZurichJS events suitable for beginners?</h3>
                <p className="text-gray-700">
                  Yes! We strive to make our events welcoming and valuable for JavaScript developers of all skill levels. Our topics are carefully selected to appeal to both beginners and advanced developers, and we ensure that content is accessible regardless of your experience level.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mb-6 bg-white p-6 rounded-lg shadow-sm"
              >
                <h3 className="text-lg font-bold mb-2 text-gray-900">Do you cover travel and accommodation for speakers?</h3>
                <p className="text-gray-700">
                  Currently, as a community-run event, we don&apos;t have the resources to cover travel and accommodation for speakers. However, this is something we&apos;re actively working on with potential sponsors to make speaking opportunities more accessible in the future.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-black text-white rounded-xl shadow-lg p-8 text-center"
            >
              <div className="bg-blue-700 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <MessageSquare size={28} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4 text-blue-400">Let&apos;s Start a Conversation! 💬</h2>
              <p className="text-xl mb-8 max-w-2xl mx-auto">
                We&apos;re excited to hear from you and welcome you to our JavaScript community in Zurich.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  href="mailto:hello@zurichjs.com" 
                  variant="primary" 
                  size="lg" 
                  className="bg-blue-700 text-white hover:bg-blue-600"
                >
                  Email Us Now
                </Button>
                <Button 
                  href="https://meetup.com/zurich-js" 
                  variant="outline" 
                  size="lg" 
                  className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black"
                >
                  Join Our Meetup
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  // This would be replaced with actual CMS fetching
  return {
    props: {
      contactPeople: [
        {
          id: '1',
          name: 'Faris Aziz',
          role: 'Founder & Lead Organizer',
          image: '/images/team/faris.jpg',
          bio: 'JavaScript enthusiast who loves bringing people together! Reach out to Faris for speaking opportunities, sponsorships, or general inquiries about ZurichJS.',
          email: 'faris@zurichjs.com',
          linkedin: 'https://linkedin.com/in/farisaziz12',
        },
        {
          id: '2',
          name: 'Bogdan Mihai Ilie',
          role: 'Founder & Lead Organizer',
          image: '/images/team/bogdan.jpg',
          bio: 'Frontend specialist with a knack for making everyone feel welcome! Contact Bogdan about community partnerships, event collaborations, or technical questions.',
          email: 'bogdan@zurichjs.com',
          linkedin: 'https://linkedin.com/in/ilie-bogdan',
        },
      ],
    },
  };
}
