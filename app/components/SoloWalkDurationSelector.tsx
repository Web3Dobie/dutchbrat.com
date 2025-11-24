// app/components/SoloWalkDurationSelector.tsx
"use client";

import { getSoloWalkOptions, formatSoloWalkPrice, getDurationDisplay } from '@/lib/pricing';

interface SoloWalkDurationSelectorProps {
  selectedDuration: number;
  dogCount: number;
  onDurationChange: (duration: number) => void;
}

export default function SoloWalkDurationSelector({ 
  selectedDuration, 
  dogCount, 
  onDurationChange 
}: SoloWalkDurationSelectorProps) {
  const durationOptions = getSoloWalkOptions();

  if (!durationOptions.length) {
    return null; // Fallback if no duration options available
  }

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <span className="text-purple-400">⏱️</span>
        Choose Walk Duration
      </h4>
      
      <div className="space-y-3">
        {durationOptions.map((option) => {
          const isSelected = selectedDuration === option.duration;
          const currentPrice = formatSoloWalkPrice(option.duration, dogCount);
          const priceForOneDog = formatSoloWalkPrice(option.duration, 1);
          const priceForTwoDogs = formatSoloWalkPrice(option.duration, 2);
          
          return (
            <div 
              key={option.duration}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                isSelected
                  ? 'border-purple-500 bg-gradient-to-r from-purple-500/20 to-blue-500/20 shadow-lg shadow-purple-500/25'
                  : 'border-gray-600 bg-gray-800/50 hover:border-purple-400 hover:bg-gray-700/50'
              }`}
              onClick={() => onDurationChange(option.duration)}
            >
              <div className="flex justify-between items-center">
                {/* Duration Info */}
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-500'
                  }`}>
                    {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                  <div>
                    <span className="text-white font-medium text-lg">
                      {getDurationDisplay(option.duration)}
                    </span>
                    <div className="text-gray-400 text-sm">
                      Perfect for {option.duration === 60 ? 'regular exercise' : 'extended adventures'}
                    </div>
                  </div>
                </div>

                {/* Pricing Display */}
                <div className="text-right">
                  <div className="text-purple-400 font-bold text-xl">
                    {currentPrice}
                  </div>
                  <div className="text-sm text-gray-400">
                    {dogCount === 1 ? (
                      `1 dog · ${priceForTwoDogs} for 2 dogs`
                    ) : (
                      `2 dogs · ${priceForOneDog} for 1 dog`
                    )}
                  </div>
                </div>
              </div>

              {/* Value Indicator */}
              {option.duration === 120 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <span>🚊</span>
                    <span>We can go to Hampstead Heath on the overground!</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pricing Summary */}
      <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-600">
        <div className="text-center">
          <span className="text-gray-400 text-sm">Selected: </span>
          <span className="text-white font-medium text-lg">
            {getDurationDisplay(selectedDuration)}
          </span>
          <div className="text-purple-400 font-medium text-sm mt-1">
            £{formatSoloWalkPrice(selectedDuration, 1)} - £{formatSoloWalkPrice(selectedDuration, 2)}
          </div>
          <div className="text-gray-500 text-xs">
            Final price depends on number of dogs
          </div>
        </div>
      </div>
    </div>
  );
}