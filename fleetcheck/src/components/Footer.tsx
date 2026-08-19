import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface FooterProps {
  setActiveTab: (tab: string) => void;
}

export default function Footer({ setActiveTab }: FooterProps) {
  return (
    <footer className="bg-[#1f1f1f] text-stone-400 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="sm:col-span-2 space-y-4">
            <div className="flex items-center space-x-2 text-white font-bold text-xl tracking-tight">
              <div className="bg-white text-[#1f1f1f] p-1.5 rounded-xl shadow-xs">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="font-extrabold tracking-tight">FleetCheck</span>
            </div>
            <p className="text-xs sm:text-sm text-stone-400 max-w-sm leading-relaxed">
              A secure, moderated risk and incident reference platform for registered fleet owners.
              Designed with strict privacy controls, administrative oversight, and active dispute systems.
              This platform is not a public blacklist.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold text-stone-200 tracking-wider uppercase mb-3 sm:mb-4">Platform</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <button onClick={() => setActiveTab('home')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Search Records
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('driver-marketplace')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Driver Marketplace
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('how-it-works')} className="hover:text-white transition-colors cursor-pointer text-left">
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('dispute-portal')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Driver Dispute Portal
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold text-stone-200 tracking-wider uppercase mb-3 sm:mb-4">Legal & Privacy</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <button onClick={() => setActiveTab('privacy')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('terms')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Terms of Use
                </button>
              </li>
              <li>
                <span className="text-stone-500">Compliance: POPIA & GDPR</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 sm:mt-12 border-t border-stone-800 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-stone-500 gap-4 text-center sm:text-left">
          <p>&copy; {new Date().getFullYear()} FleetCheck. All rights reserved. Administered privately under strict regulatory compliance.</p>
          <p className="text-stone-400">
            Providing accountability for the e-hailing ecosystem.
          </p>
        </div>
      </div>
    </footer>
  );
}

