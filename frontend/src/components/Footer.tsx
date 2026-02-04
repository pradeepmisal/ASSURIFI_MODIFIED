
import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Heart, Shield } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center space-x-2 text-2xl font-bold text-brand mb-4">
              <Shield className="h-7 w-7" />
              <span className="font-display">AssureFi</span>
            </Link>
            <p className="text-foreground/70 mb-6 max-w-md">
              AssureFi combines smart contract analysis, liquidity monitoring, and social media sentiment to provide the most comprehensive risk assessment tool in DeFi.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-foreground/70 hover:bg-brand hover:text-white transition-colors"
                aria-label="Github"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-foreground/70 hover:bg-brand hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="md:col-span-3 flex justify-end">
            <div>
              <h3 className="font-semibold text-lg mb-4">Platform Features</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/audit" className="text-foreground/70 hover:text-brand transition-colors">
                    Smart Contract Audit
                  </Link>
                </li>
                <li>
                  <Link to="/monitor" className="text-foreground/70 hover:text-brand transition-colors">
                    Liquidity Monitor
                  </Link>
                </li>
                <li>
                  <Link to="/sentiment-analysis" className="text-foreground/70 hover:text-brand transition-colors">
                    Sentiment Analysis
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-foreground/60 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} AssureFi. All rights reserved.
          </p>
          <p className="text-foreground/60 text-sm flex items-center">
            Made with <Heart className="h-4 w-4 text-risk-high mx-1" /> for the DeFi community
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
