import { motion } from 'framer-motion';
import { Linkedin, MapPin, Calendar, Mail, BookText, Shield, FileText, UserCheck } from 'lucide-react';
import Link from 'next/link';

import Section from "@/components/Section";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
      <footer>
        <Section variant="black">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* About */}
            <div>
              <h3 className="text-2xl font-bold text-js mb-4">ZurichJS</h3>
              <p className="mb-6">
                Zurich&apos;s vibrant community for JavaScript enthusiasts. Join us to connect,
                learn, and grow with fellow developers.
              </p>
              <div className="flex space-x-4">
                {/* <motion.a
                href="https://twitter.com/zurichjs"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -3, color: '#1DA1F2' }}
                className="hover:text-js transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </motion.a> */}
                <motion.a
                    href="https://linkedin.com/company/zurichjs"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{y: -3, color: '#0A66C2'}}
                    className="hover:text-js transition-colors"
                    aria-label="LinkedIn"
                >
                  <Linkedin size={20}/>
                </motion.a>
                {/* <motion.a
                href="https://github.com/zurichjs"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -3, color: '#6e5494' }}
                className="hover:text-js transition-colors"
                aria-label="GitHub"
              >
                <Github size={20} />
              </motion.a> */}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xl font-bold text-js mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/events" className="hover:text-js transition-colors">
                    Events
                  </Link>
                </li>
                <li>
                  <Link href="/speakers" className="hover:text-js transition-colors">
                    Speakers
                  </Link>
                </li>
                <li>
                  <Link href="/cfp" className="hover:text-js transition-colors">
                    Call for Papers
                  </Link>
                </li>
                <li>
                  <Link href="/partnerships" className="hover:text-js transition-colors">
                    Partnerships
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-js transition-colors">
                    About Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h3 className="text-xl font-bold text-js mb-4">Policies</h3>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <UserCheck size={16} className="mr-2 text-js"/>
                  <Link href="/policies/code-of-conduct" className="hover:text-js transition-colors">
                    Code of Conduct
                  </Link>
                </li>
                <li className="flex items-center">
                  <FileText size={16} className="mr-2 text-js"/>
                  <Link href="/policies/terms-and-conditions" className="hover:text-js transition-colors">
                    Terms and Conditions
                  </Link>
                </li>
                <li className="flex items-center">
                  <Shield size={16} className="mr-2 text-js"/>
                  <Link href="/policies/privacy-policy" className="hover:text-js transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li className="flex items-center">
                  <BookText size={16} className="mr-2 text-js"/>
                  <Link href="/policies/refund-policy" className="hover:text-js transition-colors">
                    Refund Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-xl font-bold text-js mb-4">Contact</h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <MapPin size={18} className="mr-2 text-js"/>
                  <span>Zurich, Switzerland</span>
                </li>
                <li className="flex items-center">
                  <Calendar size={18} className="mr-2 text-js"/>
                  <span>Regular meetups throughout the year</span>
                </li>
                <li className="flex items-center">
                  <Mail size={18} className="mr-2 text-js"/>
                  <a
                      href="mailto:hello@zurichjs.com"
                      className="hover:text-js transition-colors"
                  >
                    hello@zurichjs.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 mt-8 text-center text-gray-400">
            <p>© {currentYear} ZurichJS. All rights reserved.</p>
            <p className="mt-2 text-sm">
              Made with 💛 by the JavaScript community in Zurich
            </p>
          </div>
        </Section>
      </footer>
)
  ;
}
