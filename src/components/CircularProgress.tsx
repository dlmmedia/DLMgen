import React, { useEffect, useState, useMemo } from 'react';
import { Sparkles, Music, Mic, Waves, Disc, Clock } from 'lucide-react';

interface CircularProgressProps {
  step?: number;
  isInstrumental?: boolean;
  durationSeconds?: number;
  estimatedTime?: number; // in seconds
}

const STEPS = [
  { text: 'Analyzing your prompt...', icon: Sparkles, color: '#ef4444', duration: 3 },
  { text: 'Composing melody...', icon: Music, color: '#f97316', duration: 8 },
  { text: 'Generating vocals...', icon: Mic, color: '#eab308', duration: 15 },
  { text: 'Mastering audio...', icon: Waves, color: '#22c55e', duration: 5 },
  { text: 'Finalizing track...', icon: Disc, color: '#3b82f6', duration: 2 },
];

const INSTRUMENTAL_STEPS = [
  { text: 'Analyzing your prompt...', icon: Sparkles, color: '#ef4444', duration: 3 },
  { text: 'Composing melody...', icon: Music, color: '#f97316', duration: 8 },
  { text: 'Arranging instruments...', icon: Music, color: '#eab308', duration: 12 },
  { text: 'Mastering audio...', icon: Waves, color: '#22c55e', duration: 5 },
  { text: 'Finalizing track...', icon: Disc, color: '#3b82f6', duration: 2 },
];

export const CircularProgress: React.FC<CircularProgressProps> = ({ 
  step: externalStep, 
  isInstrumental = false,
  durationSeconds,
  estimatedTime 
}) => {
  const [internalStep, setInternalStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(() => Date.now());

  const steps = isInstrumental ? INSTRUMENTAL_STEPS : STEPS;
  const currentStep = externalStep ?? internalStep;

  // Calculate estimated total time based on duration
  const estimatedTotalTime = useMemo(() => {
    if (estimatedTime) return estimatedTime;
    // Base time + additional time per minute of audio
    const baseTime = 30; // seconds
    const durationMinutes = (durationSeconds || 120) / 60;
    return Math.round(baseTime + durationMinutes * 10);
  }, [estimatedTime, durationSeconds]);

  // Track elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.round((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  // Auto-advance steps if no external step is provided
  useEffect(() => {
    if (externalStep !== undefined) return;

    const stepInterval = setInterval(() => {
      setInternalStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);

    return () => clearInterval(stepInterval);
  }, [externalStep, steps.length]);

  // Animate progress bar
  useEffect(() => {
    const targetProgress = ((currentStep + 1) / steps.length) * 100;
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 1) return targetProgress;
        return prev + diff * 0.1;
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [currentStep, steps.length]);

  const CurrentIcon = steps[currentStep].icon;
  const currentColor = steps[currentStep].color;
  
  // Calculate remaining time
  const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  };

  // SVG circle calculations
  const size = 160;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center animate-in fade-in duration-500">
      {/* Circular Progress Ring */}
      <div className="relative mb-8">
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse"
          style={{ backgroundColor: currentColor }}
        />

        {/* SVG Progress Ring */}
        <svg width={size} height={size} className="transform -rotate-90 relative z-10">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={currentColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
            style={{
              filter: `drop-shadow(0 0 10px ${currentColor})`,
            }}
          />
        </svg>

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10"
            style={{ backgroundColor: `${currentColor}20` }}
          >
            <CurrentIcon
              size={36}
              className="animate-bounce-subtle"
              style={{ color: currentColor }}
            />
          </div>
        </div>

        {/* Orbiting particles */}
        <div className="absolute inset-0 animate-spin-slow">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
            style={{
              backgroundColor: currentColor,
              boxShadow: `0 0 12px ${currentColor}`,
            }}
          />
        </div>
        <div className="absolute inset-0 animate-spin-reverse-slower">
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white/60"
            style={{
              boxShadow: `0 0 8px rgba(255,255,255,0.6)`,
            }}
          />
        </div>
      </div>

      {/* Step Text */}
      <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{steps[currentStep].text}</h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
        {isInstrumental ? 'Crafting your instrumental composition...' : 'Creating your unique sound signature...'}
      </p>
      
      {/* Time Estimate */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Clock size={14} />
        <span>
          {remainingTime > 0 
            ? `~${formatTime(remainingTime)} remaining` 
            : 'Almost done...'}
        </span>
        <span className="text-gray-400 dark:text-gray-600">•</span>
        <span>{formatTime(elapsedTime)} elapsed</span>
      </div>

      {/* Step Indicators */}
      <div className="flex gap-3">
        {steps.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                i <= currentStep
                  ? 'bg-white/10 border border-white/20'
                  : 'bg-white/5 border border-white/5'
              }`}
              style={
                i <= currentStep
                  ? {
                      backgroundColor: `${steps[i].color}20`,
                      borderColor: `${steps[i].color}50`,
                    }
                  : {}
              }
            >
              <s.icon
                size={14}
                className={`transition-all duration-500 ${
                  i <= currentStep ? 'opacity-100' : 'opacity-30'
                }`}
                style={i <= currentStep ? { color: steps[i].color } : {}}
              />
            </div>
            <div
              className={`h-1 rounded-full transition-all duration-500 ${
                i <= currentStep ? 'w-8' : 'w-2'
              }`}
              style={{
                backgroundColor: i <= currentStep ? steps[i].color : 'rgba(255,255,255,0.1)',
                boxShadow: i <= currentStep ? `0 0 8px ${steps[i].color}50` : 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Progress percentage */}
      <div className="mt-6 text-sm font-mono text-gray-400 dark:text-white/40">
        {Math.round(progress)}% complete
      </div>
    </div>
  );
};

