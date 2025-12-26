import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { HeroVisualizer } from './HeroVisualizer';

interface Banner {
    id: string;
    tag: string;
    tagColor: string;
    title: string;
    subtitle: string;
    description: string;
    buttonText: string;
    buttonAction?: () => void;
    bgGradient: string;
    decoration?: React.ReactNode;
}

const banners: Banner[] = [
    {
        id: 'holiday',
        tag: 'SPECIAL',
        tagColor: 'bg-primary',
        title: 'Master the art of AI music generation',
        subtitle: '',
        description: "Transform your ideas into high-quality tracks instantly. The most advanced AI music generator at your fingertips.",
        buttonText: 'Get Started',
        bgGradient: 'from-primary/90 via-red-900/60 to-black',
    },
    {
        id: 'create',
        tag: 'NEW',
        tagColor: 'bg-accent',
        title: 'Your studio, everywhere',
        subtitle: '',
        description: 'Professional grade audio generation. From cinematic scores to radio-ready pop hits.',
        buttonText: 'Start creating',
        bgGradient: 'from-red-950 via-primary/40 to-black',
    },
    {
        id: 'trending',
        tag: 'TRENDING',
        tagColor: 'bg-red-600',
        title: 'Explosive new talent',
        subtitle: '',
        description: 'Join the community of creators shaping the future of music with DLM Gen.',
        buttonText: 'Explore community',
        bgGradient: 'from-secondary via-primary/30 to-black',
    },
];

interface HeroBannerProps {
    onNavigate?: (tab: string) => void;
    isPlaying: boolean;
    analyser?: AnalyserNode | null;
    currentTrack?: any;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onNavigate, isPlaying, analyser, currentTrack }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const goToPrev = () => {
        setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    };

    const currentBanner = banners[currentIndex];

    if (isPlaying) {
        return (
            <div className="relative rounded-2xl overflow-hidden min-h-[300px] border border-white/5 shadow-2xl shadow-primary/10">
                <HeroVisualizer
                    isPlaying={isPlaying}
                    analyser={analyser}
                    trackTitle={currentTrack?.title}
                />
            </div>
        );
    }

    if (isCollapsed) {
        return (
            <div
                onClick={() => setIsCollapsed(false)}
                className="relative rounded-2xl overflow-hidden cursor-pointer group h-16 bg-gradient-to-r from-primary/40 to-black border border-white/5"
            >
                <div className="absolute inset-0 flex items-center justify-between px-8">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-white/80 font-medium text-sm">{currentBanner.title}</span>
                    </div>
                    <ChevronUp className="text-white/40 group-hover:text-white transition-all transform rotate-180" size={20} />
                </div>
            </div>
        );
    }

    return (
        <div className="relative rounded-3xl overflow-hidden group border border-white/10 shadow-2xl">
            {/* Background with gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${currentBanner.bgGradient} transition-all duration-700 ease-in-out`} />

            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -right-20 -top-20 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
                <div className="absolute right-20 top-1/2 -translate-y-1/2 w-64 h-64 opacity-40">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-transparent rounded-full transform rotate-12 blur-2xl animate-pulse" />
                    <div className="absolute inset-8 border border-white/10 rounded-full transform -rotate-12 animate-spin-slow" />
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 p-10 md:p-14 min-h-[320px] flex flex-col justify-center">
                {/* Tag */}
                <div className="mb-6 transform transition-all duration-500 group-hover:translate-x-1">
                    <span className={`${currentBanner.tagColor} text-white text-[10px] tracking-[0.2em] font-black px-4 py-1.5 rounded-full uppercase shadow-lg shadow-black/20`}>
                        {currentBanner.tag}
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 max-w-2xl leading-[1.1] tracking-tight">
                    {currentBanner.title}
                </h1>

                {/* Description */}
                <p className="text-white/60 text-base md:text-lg max-w-lg mb-8 leading-relaxed font-medium">
                    {currentBanner.description}
                </p>

                {/* CTA Button */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onNavigate?.('create')}
                        className="bg-white text-black px-8 py-3.5 rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-white/20"
                    >
                        {currentBanner.buttonText}
                    </button>
                    <button className="p-3.5 rounded-full border border-white/10 text-white hover:bg-white/5 transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Navigation Arrows */}
            <div className="absolute inset-y-0 left-4 flex items-center">
                <button
                    onClick={goToPrev}
                    className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-primary/40 hover:border-primary/50 transition-all opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0"
                >
                    <ChevronLeft size={24} />
                </button>
            </div>
            <div className="absolute inset-y-0 right-4 flex items-center">
                <button
                    onClick={goToNext}
                    className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-primary/40 hover:border-primary/50 transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Close button */}
            <button
                onClick={() => setIsCollapsed(true)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white/50 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            >
                <ChevronUp size={16} className="transform rotate-180" />
            </button>

            {/* Dots indicator */}
            <div className="absolute bottom-8 left-14 flex gap-3">
                {banners.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`transition-all duration-300 ${idx === currentIndex
                            ? 'w-8 h-1.5 bg-white rounded-full'
                            : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40 rounded-full'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};
