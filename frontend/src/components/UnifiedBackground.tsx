import React from 'react';
import { motion } from 'framer-motion';

interface UnifiedBackgroundProps {
    children?: React.ReactNode;
}

const UnifiedBackground: React.FC<UnifiedBackgroundProps> = ({ children }) => {
    return (
        <div className="relative min-h-screen bg-slate-950 text-slate-100">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                {/* Static Grid Pattern */}
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
                    className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px]"
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

                {/* Floating Particles (Slow, consistent animation) */}
                {[...Array(15)].map((_, i) => (
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
                            duration: 8 + Math.random() * 4, // Slow duration 8-12s
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: Math.random() * 5
                        }}
                    />
                ))}
            </div>

            {/* Content */}
            <div className="relative z-10 min-h-screen flex flex-col">
                {children}
            </div>
        </div>
    );
};

export default UnifiedBackground;
