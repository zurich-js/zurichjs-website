import { Linkedin, MapPin, Calendar, Mail, Mic, Heart, Building, Sparkles } from "lucide-react";
import Link from "next/link";

import Section from "@/components/Section";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer>
      <Section variant="black">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-14">
          {/* Brand */}
          <div>
            <h3 className="text-[22px] font-extrabold text-zjs-yellow mb-4">ZurichJS</h3>
            <p className="text-[var(--zjs-gray-400)] text-sm leading-relaxed max-w-[28ch]">
              Zurich&apos;s vibrant community for JavaScript enthusiasts. Connect, learn, and grow
              with fellow developers.
            </p>
            <div className="flex gap-3 mt-6">
              <a
                href="https://linkedin.com/company/zurichjs"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-[var(--zjs-gray-300)] hover:bg-zjs-yellow hover:text-zjs-black transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={16} />
              </a>
            </div>
          </div>

          {/* Get Involved */}
          <div>
            <h4 className="text-[13px] font-bold text-zjs-yellow mb-4 tracking-wide uppercase">
              Get involved
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li className="text-sm text-[var(--zjs-gray-300)] flex items-center gap-2">
                <Mic size={14} className="opacity-70" />
                <Link href="/cfp" className="hover:text-white transition-colors">
                  Submit a talk
                </Link>
              </li>
              <li className="text-sm text-[var(--zjs-gray-300)] flex items-center gap-2">
                <Heart size={14} className="opacity-70" />
                <Link href="/donate" className="hover:text-white transition-colors">
                  Support us
                </Link>
              </li>
              <li className="text-sm text-[var(--zjs-gray-300)] flex items-center gap-2">
                <Building size={14} className="opacity-70" />
                <Link href="/partnerships" className="hover:text-white transition-colors">
                  Host an event
                </Link>
              </li>
              <li className="text-sm text-[var(--zjs-gray-300)] flex items-center gap-2">
                <Sparkles size={14} className="opacity-70" />
                <Link href="/partnerships" className="hover:text-white transition-colors">
                  Sponsor us
                </Link>
              </li>
            </ul>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-[13px] font-bold text-zjs-yellow mb-4 tracking-wide uppercase">
              Explore
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link
                  href="/events"
                  className="text-sm text-[var(--zjs-gray-300)] hover:text-white transition-colors"
                >
                  Events
                </Link>
              </li>
              <li>
                <Link
                  href="/workshops"
                  className="text-sm text-[var(--zjs-gray-300)] hover:text-white transition-colors"
                >
                  Workshops
                </Link>
              </li>
              <li>
                <Link
                  href="/speakers"
                  className="text-sm text-[var(--zjs-gray-300)] hover:text-white transition-colors"
                >
                  Speakers
                </Link>
              </li>
              <li>
                <Link
                  href="/media"
                  className="text-sm text-[var(--zjs-gray-300)] hover:text-white transition-colors"
                >
                  Photos & Videos
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-[var(--zjs-gray-300)] hover:text-white transition-colors"
                >
                  About us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[13px] font-bold text-zjs-yellow mb-4 tracking-wide uppercase">
              Contact
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li className="text-sm text-[var(--zjs-gray-300)] flex items-center gap-2">
                <MapPin size={14} className="opacity-70" />
                Zurich, Switzerland
              </li>
              <li className="text-sm text-[var(--zjs-gray-300)] flex items-center gap-2">
                <Mail size={14} className="opacity-70" />
                <a href="mailto:hello@zurichjs.com" className="hover:text-white transition-colors">
                  hello@zurichjs.com
                </a>
              </li>
              <li className="text-sm text-[var(--zjs-gray-300)] flex items-center gap-2">
                <Calendar size={14} className="opacity-70" />
                Meetups monthly
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-7 border-t border-white/10 text-[13px] text-[var(--zjs-gray-500)]">
          <p>
            © {currentYear} Swiss JavaScript Group (
            <a
              href="https://www.uid.admin.ch/Detail.aspx?uid_id=CHE255581547"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zjs-yellow transition-colors"
            >
              CHE-255.581.547
            </a>
            ){" · "}
            <Link
              href="/policies/code-of-conduct"
              className="hover:text-zjs-yellow transition-colors"
            >
              Code of Conduct
            </Link>
            {" · "}
            <Link
              href="/policies/privacy-policy"
              className="hover:text-zjs-yellow transition-colors"
            >
              Privacy
            </Link>
            {" · "}
            <Link
              href="/policies/terms-and-conditions"
              className="hover:text-zjs-yellow transition-colors"
            >
              Terms
            </Link>
          </p>
        </div>
      </Section>
    </footer>
  );
}
