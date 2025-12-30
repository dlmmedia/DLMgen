import React, { useEffect, useState } from 'react';
import { Sparkles, Music, Mic, Waves } from 'lucide-react';

export const GenerationLoader = () => {
    const [step, setStep] = useState(0);
    const steps = [
        { text: "Analyzing prompt...", icon: Sparkles },
        { text: "Composing melody...", icon: Music },
        { text: "Writing lyrics...", icon: Mic },
        { text: "Mastering audio...", icon: Waves }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
        }, 1500); // 1.5s per step
        return () => clearInterval(interval);
    }, []);

    const CurrentIcon = steps[step].icon;

    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-900 dark:text-white animate-in fade-in duration-500">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="w-24 h-24 bg-white/40 dark:bg-black/40 border border-primary/30 rounded-full flex items-center justify-center relative z-10 backdrop-blur-md">
                    <CurrentIcon size={40} className="text-primary animate-bounce-subtle" />
                </div>

                {/* Orbital particles */}
                <div className="absolute inset-0 animate-spin-slow">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(153,27,27,0.8)]" />
                </div>
                <div className="absolute inset-0 animate-spin-reverse-slower">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                </div>
            </div>

            <h3 className="text-xl font-bold mb-2">{steps[step].text}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Crafting your unique sound signature...</p>

            <div className="mt-8 flex gap-2">
                {steps.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-500 ${i <= step ? 'w-8 bg-primary shadow-[0_0_10px_rgba(153,27,27,0.5)]' : 'w-2 bg-gray-300 dark:bg-gray-800'}`}
                    />
                ))}
            </div>
        </div>
    );
};
