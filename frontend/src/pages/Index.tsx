import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  BarChart3,
  MessageSquare,
  Activity,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Zap,
  Lock,
  Eye,
  Users,
  Globe
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '@/components/ui/button';

const Index = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const features = [
    {
      title: "Smart Contract Audit",
      description: "AI-powered vulnerability detection with real-time code analysis and comprehensive security scoring.",
      icon: Shield,
      link: "/audit",
      gradient: "from-blue-500 to-cyan-500",
      iconBg: "bg-blue-500/10",
      stats: "10,000+ Audits"
    },
    {
      title: "Liquidity Monitor",
      description: "Track liquidity pools in real-time, detect rug pull risks, and analyze price impact instantly.",
      icon: Activity,
      link: "/monitor",
      gradient: "from-green-500 to-emerald-500",
      iconBg: "bg-green-500/10",
      stats: "24/7 Monitoring"
    },
    {
      title: "Sentiment Analysis",
      description: "AI-driven social sentiment tracking from Reddit, Twitter, and crypto communities worldwide.",
      icon: MessageSquare,
      link: "/sentiment-analysis",
      gradient: "from-purple-500 to-pink-500",
      iconBg: "bg-purple-500/10",
      stats: "Real-time Insights"
    }
  ];

  const smartContractPlatforms = [
    "Ethereum ERC-20", "Binance Smart Chain", "Polygon", "Solana",
    "Avalanche", "Arbitrum", "Optimism", "Uniswap V2/V3",
    "PancakeSwap", "SushiSwap", "Curve Finance", "Aave",
    "Compound", "MakerDAO", "Chainlink", "Wrapped Bitcoin",
    "Tether USDT", "USD Coin", "Staking Contracts", "NFT Contracts",
    "DeFi Protocols", "Yield Farming", "Liquidity Pools", "DAO Governance"
  ];

  const trustBadges = [
    { icon: Lock, text: "Bank-Grade Security" },
    { icon: Zap, text: "Lightning Fast" },
    { icon: Eye, text: "Full Transparency" },
    { icon: Users, text: "Trusted by 10K+" }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <Navbar />

      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Gradient Orbs */}
        <motion.div
          className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px]"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px]"
          animate={{
            x: [0, -50, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Floating Bitcoin Icons */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-blue-500/10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 360],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5
            }}
          >
            <Globe className="w-16 h-16" />
          </motion.div>
        ))}

        {/* Animated Particle Dots */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-blue-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              x: [0, Math.random() * 50 - 25, 0],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0]
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 3
            }}
          />
        ))}
      </div>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center px-4 md:px-8 pt-20">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8"
                whileHover={{ scale: 1.05 }}
              >
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-300">AI-Powered DeFi Security Platform</span>
              </motion.div>

              {/* Main Headline */}
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                Protect Your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400">
                  DeFi Investments
                </span>
                <br />
                with AI-Powered Security
              </h1>

              {/* Subheadline */}
              <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto">
                Analyze smart contracts, monitor liquidity, and detect risks before you invest.
                Make informed decisions with real-time AI analysis.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <Link to="/login">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all"
                  >
                    Start Free Analysis
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-center gap-6 mb-12">
                {trustBadges.map((badge, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-2 text-slate-400"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                  >
                    <badge.icon className="w-5 h-5 text-blue-400" />
                    <span className="text-sm">{badge.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Trusted By Section */}
              <motion.div
                className="mt-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <p className="text-sm text-slate-500 mb-6 uppercase tracking-wider">Trusted by Leading DeFi Projects</p>
                <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60">
                  {/* Crypto Company Logos as Text (you can replace with actual logos later) */}
                  <div className="text-slate-400 font-semibold text-lg hover:text-blue-400 transition-colors">Uniswap</div>
                  <div className="text-slate-400 font-semibold text-lg hover:text-blue-400 transition-colors">Aave</div>
                  <div className="text-slate-400 font-semibold text-lg hover:text-blue-400 transition-colors">Compound</div>
                  <div className="text-slate-400 font-semibold text-lg hover:text-blue-400 transition-colors">Curve</div>
                  <div className="text-slate-400 font-semibold text-lg hover:text-blue-400 transition-colors">MakerDAO</div>
                  <div className="text-slate-400 font-semibold text-lg hover:text-blue-400 transition-colors">Chainlink</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Comprehensive{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  Security Suite
                </span>
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Everything you need to protect your DeFi investments in one powerful platform
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.2 }}
                  >
                    <Link to={feature.link}>
                      <motion.div
                        className="group relative h-full p-8 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm overflow-hidden"
                        whileHover={{
                          scale: 1.02,
                          borderColor: 'rgba(59, 130, 246, 0.5)',
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Gradient Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                        {/* Icon */}
                        <div className={`relative w-16 h-16 ${feature.iconBg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                          <IconComponent className="w-8 h-8 text-blue-400" />
                        </div>

                        {/* Content */}
                        <h3 className="relative text-2xl font-bold mb-3 text-white">
                          {feature.title}
                        </h3>
                        <p className="relative text-slate-400 mb-4 leading-relaxed">
                          {feature.description}
                        </p>

                        {/* Stats Badge */}
                        <div className="relative flex items-center gap-2 text-sm text-blue-400">
                          <CheckCircle className="w-4 h-4" />
                          <span>{feature.stats}</span>
                        </div>

                        {/* Arrow */}
                        <div className="relative mt-6 flex items-center text-blue-400 group-hover:translate-x-2 transition-transform duration-300">
                          <span className="text-sm font-medium">Learn more</span>
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 md:px-8">
          <motion.div
            className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Start Protecting Your Investments Today
            </h2>
            <p className="text-xl text-slate-300 mb-8">
              Join thousands of smart investors using ASSUREFI to make safer DeFi decisions
            </p>
            <Link to="/login">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-6 text-lg rounded-xl shadow-lg shadow-blue-500/50"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-slate-400 mt-4">No credit card required</p>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
