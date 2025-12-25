import React, { useEffect, useRef } from 'react';

interface HeroVisualizerProps {
    isPlaying: boolean;
}

export const HeroVisualizer: React.FC<HeroVisualizerProps> = ({ isPlaying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let bars: number[] = Array(50).fill(0);

        const resize = () => {
            canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
            canvas.height = canvas.parentElement?.clientHeight || 300;
        };

        window.addEventListener('resize', resize);
        resize();

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = canvas.width / bars.length;

            bars = bars.map(h => {
                if (!isPlaying) return Math.max(h * 0.9, 10); // Decay to baseline
                const target = Math.random() * (canvas.height * 0.8);
                return h + (target - h) * 0.2; // Smooth transition
            });

            // Gradient
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, '#A855F7'); // Purple
            gradient.addColorStop(0.5, '#EC4899'); // Pink
            gradient.addColorStop(1, '#00f3ff'); // Cyan

            ctx.fillStyle = gradient;

            bars.forEach((h, i) => {
                const x = i * barWidth;
                const y = canvas.height - h;

                // Rounded bars
                ctx.beginPath();
                ctx.roundRect(x + 2, y, barWidth - 4, h, 4);
                ctx.fill();
            });

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, [isPlaying]);

    return (
        <div className="relative w-full h-[300px] md:h-[400px] bg-gradient-to-b from-purple-900/20 to-black overflow-hidden rounded-xl border border-white/5">
            {/* Background Glow */}
            <div className={`absolute inset-0 bg-primary/20 blur-[100px] transition-opacity duration-1000 ${isPlaying ? 'opacity-100' : 'opacity-30'}`} />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                    DLM MUSIC GEN
                </h1>
            </div>

            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-80" />
        </div>
    );
};
