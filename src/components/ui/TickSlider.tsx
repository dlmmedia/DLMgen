import React from 'react';

interface TickSliderProps {
  label: string;
  value: number; // 0-100
  onChange: (value: number) => void;
  infoTooltip?: string;
  className?: string;
}

export const TickSlider: React.FC<TickSliderProps> = ({
  label,
  value,
  onChange,
  infoTooltip,
  className = '',
}) => {
  const ticks = 12; // Number of tick marks
  const activeTickIndex = Math.round((value / 100) * (ticks - 1));

  const handleTickClick = (index: number) => {
    const newValue = Math.round((index / (ticks - 1)) * 100);
    onChange(newValue);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-300">{label}</span>
          {infoTooltip && (
            <div className="group relative">
              <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-gray-400 cursor-help">
                i
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {infoTooltip}
              </div>
            </div>
          )}
        </div>
        <span className="text-sm text-gray-400 font-mono">{value}%</span>
      </div>

      {/* Tick marks container */}
      <div className="flex items-center gap-1 py-1">
        {Array.from({ length: ticks }).map((_, index) => {
          const isActive = index === activeTickIndex;
          const isBeforeActive = index < activeTickIndex;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleTickClick(index)}
              className={`flex-1 h-6 rounded transition-all duration-150 ${
                isActive
                  ? 'bg-primary shadow-[0_0_8px_rgba(236,72,153,0.5)]'
                  : isBeforeActive
                  ? 'bg-white/20'
                  : 'bg-white/10 hover:bg-white/15'
              }`}
              aria-label={`Set to ${Math.round((index / (ticks - 1)) * 100)}%`}
            />
          );
        })}
      </div>
    </div>
  );
};

