import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, BarChart3, MessageSquare, Activity, Wallet, TrendingUp, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '@/components/PageTransition';

const Index = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const features = [
    {
      title: "Smart Contract Audit",
      description: "Comprehensive security analysis of smart contracts to identify vulnerabilities and risks.",
      icon: Shield,
      link: "/audit",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-500"
    },
    {
      title: "Equity Monitor",
      description: "Real-time monitoring of liquidity and equity changes to detect potential risks.",
      icon: BarChart3,
      link: "/monitor",
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-500/10",
      iconColor: "text-green-500"
    },
    {
      title: "Sentiment Analysis",
      description: "AI-powered analysis of social media and market sentiment for better decision making.",
      icon: MessageSquare,
      link: "/sentiment-analysis",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
      iconColor: "text-purple-500"
    },
    {
      title: "Risk Analysis",
      description: "Advanced risk assessment tools to evaluate and mitigate potential threats.",
      icon: Activity,
      link: "/risk-analysis",
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-500/10",
      iconColor: "text-red-500"
    },
    {
      title: "Wallet Analysis",
      description: "Deep analysis of wallet addresses and transaction patterns for security insights.",
      icon: Wallet,
      link: "/wallet-analysis",
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-500/10",
      iconColor: "text-orange-500"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <PageTransition>
          <div className="relative py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
            <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                ASSUREFI <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Features</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Comprehensive DeFi security and risk analysis tools to protect your investments and maximize your returns.
              </p>
              <div className="flex items-center justify-center gap-4 text-gray-400">
                <TrendingUp className="w-5 h-5" />
                <span>AI-Powered Security Solutions</span>
              </div>
            </div>
          </div>
        </PageTransition>

        {/* Features Grid */}
        <PageTransition delay={0.05}>
          <div className="py-20">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Our Security Features
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  Choose from our comprehensive suite of DeFi security and analysis tools
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {features.map((feature, index) => {
                  const IconComponent = feature.icon;
                  return (
                    <Link
                      key={index}
                      to={feature.link}
                      className="group block"
                    >
                      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700">
                        <div className={`w-16 h-16 ${feature.bgColor} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                          <IconComponent className={`w-8 h-8 ${feature.iconColor}`} />
                        </div>
                        
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                          {feature.title}
                        </h3>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                          {feature.description}
                        </p>
                        
                        <div className="flex items-center text-sm font-medium group-hover:translate-x-2 transition-transform duration-300">
                          <span className={`bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                            Get Started
                          </span>
                          <ArrowRight className="w-4 h-4 ml-2 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </PageTransition>

        {/* CTA Section */}
        <PageTransition delay={0.1}>
          <div className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to Secure Your DeFi Investments?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Start analyzing your smart contracts and monitoring risks today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/audit"
                  className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
                >
                  Start Smart Contract Audit
                </Link>
                <Link
                  to="/monitor"
                  className="px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
                >
                  Begin Monitoring
                </Link>
              </div>
            </div>
          </div>
        </PageTransition>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
