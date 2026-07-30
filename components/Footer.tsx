"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, ArrowRight, ShieldCheck } from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
} from "react-icons/fa";

const quickLinks = [
  {
    title: "Home",
    href: "/",
  },
  {
    title: "Products",
    href: "/products",
  },
  {
    title: "About Us",
    href: "/about",
  },
  {
    title: "Contact",
    href: "/contact",
  },
];

const policies = [
  {
    title: "Terms of Use",
    href: "/terms-of-use",
  },
  {
    title: "Return Policy",
    href: "/return-policy",
  },
  {
    title: "Privacy Policy",
    href: "/privacy-policy",
  },
  {
    title: "Cancellation Policy",
    href: "/cancellation-policy",
  },
];

const enquire = [
  "About Us",
  "Contact Us",
  "FAQs",
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#ECD7B9] pt-24">

      {/* Background */}

      <div className="absolute inset-0 overflow-hidden">

        <motion.div
          animate={{
            y: [-20, 20, -20],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
          }}
          className="absolute -left-44 top-0 h-[420px] w-[420px] rounded-full bg-[#ECD7B9] blur-[120px]"
        />

        <motion.div
          animate={{
            y: [20, -20, 20],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
          }}
          className="absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-[#ECD7B9] blur-[120px]"
        />

        {/* Leaf Emojis replacing images */}
        <div className="pointer-events-none absolute left-0 top-10 hidden text-[180px] opacity-10 lg:block">
          🌿
        </div>

        <div className="pointer-events-none absolute bottom-10 right-0 hidden text-[180px] opacity-10 lg:block">
          🌿
        </div>

      </div>


      <div className="relative mx-auto max-w-7xl px-6">


        {/* Newsletter */}

        <motion.div
          initial={{
            opacity: 0,
            y: 40,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: .7,
          }}
          className="mb-24 rounded-[40px] border border-white/60 bg-white/50 p-10 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,.08)]"
        >

          <div className="grid items-center gap-10 lg:grid-cols-2">

            <div>

              <span className="rounded-full border border-[#D7C6A5] bg-white px-5 py-2 text-sm font-semibold tracking-[4px] text-[#556B2F]">
                NEWSLETTER
              </span>

              <h2 className="mt-6 text-5xl font-black text-black font-playfair">
                Stay Connected
              </h2>

              <p className="mt-5 text-lg leading-8 text-[#6A645B]">
                Subscribe to receive herbal wellness tips,
                exclusive offers, seasonal updates,
                and Ayurvedic knowledge directly in your inbox.
              </p>

            </div>


            <div className="flex flex-col gap-4 sm:flex-row">

              <div className="relative flex-1">

                <Mail
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-[#556B2F]"
                  size={20}
                />

                <input
                  type="email"
                  placeholder="Enter your email address"
                  className="h-16 w-full rounded-full border border-[#D7C6A5] bg-white pl-14 pr-5 outline-none transition focus:border-[#556B2F]"
                />

              </div>


              <button className="group flex h-16 items-center justify-center gap-3 rounded-full bg-[#355A29] px-8 font-semibold text-white transition hover:bg-[#405122]">

                Subscribe

                <ArrowRight
                  size={20}
                  className="transition group-hover:translate-x-1"
                />

              </button>

            </div>

          </div>

        </motion.div>


        {/* Main Footer */}

        <div className="grid items-start gap-12 border-t border-[#D9C8A7]/60 py-20 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.3fr]">


          {/* Logo Section */}

          <motion.div
            initial={{
              opacity:0,
              y:30
            }}
            whileInView={{
              opacity:1,
              y:0
            }}
            viewport={{
              once:true
            }}
          >

            <div className="flex items-center gap-5">

              <Image
                src="/aaushadhi_logo.svg"
                alt="Aaushadhi Wellness"
                width={90}
                height={90}
                className="rounded-3xl shadow-xl"
              />


              <div>

                <h3
                  className="text-3xl font-bold text-[#556B2F]"
                  style={{
                    fontFamily:"var(--font-playfair)"
                  }}
                >
                  Aaushadhi Wellness
                </h3>

                <p className="text-[#7C735F]">
                  Connected To Nature & Health
                </p>

              </div>

            </div>


            <p className="mt-8 max-w-sm leading-8 text-[#6A645B]">

              We create authentic Ayurvedic wellness products using
              premium herbs, sustainable farming practices,
              and centuries-old traditional formulations.

            </p>


            <div className="mt-8 flex gap-4">

              {[
                {
                  icon:FaFacebookF,
                  href:"https://www.facebook.com/share/1EL3uvziQP/?mibextid=wwXIfr"
                },
                {
                  icon:FaInstagram,
                  href:"https://www.instagram.com/aaushadhi_wellness/"
                },
                {
                  icon:FaWhatsapp,
                  href:"https://wa.me/918269431640"
                }
              ].map(({icon:Icon,href},i)=>(
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  className="text-[#6A645B] hover:text-black"
                >
                  <Icon/>
                </a>
              ))}

            </div>


          </motion.div>

          {/* Quick Links */}

          <motion.div
            initial={{
              opacity:0,
              y:25
            }}
            whileInView={{
              opacity:1,
              y:0
            }}
            viewport={{
              once:true
            }}
            transition={{
              delay:.2
            }}
          >

            <h4
              className="mb-8 text-3xl font-bold text-[#556B2F]"
              style={{
                fontFamily:"var(--font-playfair)"
              }}
            >
              Quick Links
            </h4>


            <ul className="space-y-5">

              {quickLinks.map((item)=>(
                <li key={item.title}>

                  <Link
                    href={item.href}
                    className="group flex items-center gap-2 text-[#5F5B54] transition hover:text-[#556B2F]"
                  >

                    <ArrowRight
                      size={15}
                      className="opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100"
                    />

                    {item.title}

                  </Link>

                </li>
              ))}

            </ul>


          </motion.div>



          {/* Policy */}

          <motion.div
            initial={{
              opacity:0,
              y:25
            }}
            whileInView={{
              opacity:1,
              y:0
            }}
            viewport={{
              once:true
            }}
            transition={{
              delay:.3
            }}
          >

            


            <ul className="space-y-5">


              <h4
              className="mb-8 text-3xl font-bold text-[#556B2F]"
              style={{
                fontFamily:"var(--font-playfair)"
              }}
            >
              Privacy & Policies
            </h4>

              {policies.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-2 text-[#5F5B54] transition hover:text-[#556B2F]"
                  >
                    <ArrowRight
                      size={15}
                      className="opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100"
                    />
                    {item.title}
                  </Link>
                </li>
              ))}

            </ul>


          </motion.div>




          {/* Enquire */}

          <motion.div
            initial={{
              opacity:0,
              y:25
            }}
            whileInView={{
              opacity:1,
              y:0
            }}
            viewport={{
              once:true
            }}
            transition={{
              delay:.4
            }}
          >

            <h4
              className="mb-8 text-3xl font-bold text-[#556B2F]"
              style={{
                fontFamily:"var(--font-playfair)"
              }}
            >
              Enquire
            </h4>


            <ul className="space-y-5">

              {enquire.map((item)=>(
                <li key={item}>

                  <Link
                    href="#"
                    className="group flex items-center gap-2 text-[#5F5B54] transition hover:text-[#556B2F]"
                  >

                    <ArrowRight
                      size={15}
                      className="opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100"
                    />

                    {item}

                  </Link>

                </li>
              ))}

            </ul>



            {/* Contact Card */}

            <div className="mt-10 rounded-3xl border border-[#D7C6A5] bg-white/60 p-6 backdrop-blur-xl shadow-lg">

              <h5 className="text-lg font-bold text-[#2F3E2D]">
                Need Assistance?
              </h5>


              <p className="mt-3 text-sm leading-7 text-[#6A645B]">

                Our wellness experts are available to help you choose
                the right Ayurvedic products.

              </p>



              <Link href="/contact">

                <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#556B2F] px-6 py-3 font-semibold text-white transition hover:bg-[#405122]">

                  Contact Us

                  <ArrowRight size={18}/>

                </button>

              </Link>


            </div>


          </motion.div>


        </div>



        {/* Divider */}

        <div className="h-px w-full bg-[#D9C8A7]/60"/>



        {/* Bottom Footer */}


        <motion.div
          initial={{
            opacity:0,
            y:20
          }}
          whileInView={{
            opacity:1,
            y:0
          }}
          viewport={{
            once:true
          }}
          className="flex flex-col items-center justify-between gap-6 py-8 text-center lg:flex-row"
        >


          <p className="text-sm text-[#6A645B]">

            © {new Date().getFullYear()}{" "}

            <span className="font-semibold text-[#556B2F]">
              Aaushadhi Wellness
            </span>

            . All Rights Reserved.

          </p>



          <div className="flex items-center gap-2 text-sm text-[#6A645B]">

            <span>
              Made with
            </span>

            <span className="text-lg text-red-500">
              ❤️
            </span>

            <span>
              in India
            </span>

          </div>




          <div className="flex items-center gap-3 rounded-full border border-[#D7C6A5] bg-white/60 px-5 py-2 backdrop-blur-md">

            <ShieldCheck
              size={18}
              className="text-[#556B2F]"
            />

            <span className="text-sm font-medium text-[#556B2F]">
              100% Secure Payments
            </span>

          </div>


        </motion.div>


      </div>



      {/* Bottom Glow */}

      <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-[500px] -translate-x-1/2 rounded-full bg-[#FFF6E8]/60 blur-[120px]"/>


    </footer>
  );
}