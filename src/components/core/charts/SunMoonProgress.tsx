import React, { useState, useEffect } from 'react';
import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from '../../../../tailwind.config'; // Adjust path as needed

const fullConfig = resolveConfig(tailwindConfig);

interface SunMoonProgressProps {
  currentHours: number;
  goalHours: number;
  size?: number;
  label?: string;
  barSize?: number;
  textClassName?: string;
}

// Helper to get Tailwind colors programmatically
const getGenesisColor = (colorName: string): string => {
  const color = fullConfig.theme?.colors?.genesis?.[colorName] as string;
  return color || '#000000'; // Default to black if color not found
};

const SunMoonProgress: React.FC<SunMoonProgressProps> = ({ 
  currentHours,
  goalHours,
  size = 180,
  label,
  barSize = 12,
  textClassName,
}) => {
  const progress = goalHours > 0 ? Math.min(currentHours / goalHours, 1) : 0;
  const radius = size / 2 - barSize;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  const [runBurstAnimation, setRunBurstAnimation] = useState(false);

  useEffect(() => {
    if (progress >= 1 && !runBurstAnimation) {
      // Delay slightly to ensure progress bar animation completes
      const timer = setTimeout(() => {
        setRunBurstAnimation(true);
      }, 700); // Matches stroke-dashoffset transition
      return () => clearTimeout(timer);
    } else if (progress < 1 && runBurstAnimation) {
      setRunBurstAnimation(false);
    }
  }, [progress, runBurstAnimation]);

  let strokeColorValue = getGenesisColor('dark-blue');
  if (progress > 0.85) {
    strokeColorValue = getGenesisColor('sun-orange');
  } else if (progress > 0.65) {
    strokeColorValue = getGenesisColor('sun-yellow');
  } else if (progress > 0.4) {
    strokeColorValue = getGenesisColor('pale-yellow');
  } else if (progress > 0.15) {
    strokeColorValue = getGenesisColor('light-blue');
  } else if (progress > 0) {
    strokeColorValue = getGenesisColor('mid-blue');
  }

  const iconSize = size * 0.4;

  return (
    <>
      <style>
        {`
          @keyframes sunBurstEffect {
            0% {
              transform: scale(1.2) rotate(0deg); /* Start from a slightly scaled up version */
              opacity: 1;
            }
            50% {
              transform: scale(1.7) rotate(360deg); /* Peak excitement: larger and full spin */
              opacity: 1;
            }
            100% {
              transform: scale(1.35) rotate(360deg); /* Settle: slightly larger, spin complete */
              opacity: 1;
            }
          }
          .animate-sunBurstEffect {
            animation: sunBurstEffect 1.5s ease-out forwards;
            transform-origin: center; 
            transform-box: fill-box;
          }

          @keyframes sunGlowBurstEffect {
            0% {
              transform: scale(1);
              opacity: 0.7;
            }
            50% {
              transform: scale(1.5);
              opacity: 1;
            }
            100% {
              transform: scale(1.1);
              opacity: 0.8;
            }
          }
          .animate-sunGlowBurstEffect {
            animation: sunGlowBurstEffect 1.5s ease-out forwards;
            transform-origin: center; 
            transform-box: fill-box;
          }
        `}
      </style>
      <div 
        className="relative flex flex-col items-center justify-center"
        style={{ width: size, height: size + (label ? 20 : 0) }}
      >
        {label && (
          <h3 className={`text-md font-semibold mb-1 text-center text-foreground ${textClassName || ''}`}>
            {label}
          </h3>
        )}
        <div 
          className="relative flex items-center justify-center rounded-full"
          style={{ width: size, height: size }}
        >
          <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
            <defs>
              <filter id="sunGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={barSize}
              stroke="rgba(128, 128, 128, 0.08)"
              fill="transparent"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={barSize}
              stroke={strokeColorValue}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.7s cubic-bezier(0.65, 0, 0.35, 1), stroke 0.7s cubic-bezier(0.65, 0, 0.35, 1)',
              }}
            />
          </svg>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <svg 
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24" 
              className="absolute transition-all duration-1000 ease-in-out text-genesis-light-blue fill-current"
              style={{
                opacity: progress < 0.5 ? 1 : 0,
                transform: `rotate(${progress * -360}deg) scale(${1 - progress * 1.5})`,
                filter: progress > 0.4 ? 'blur(5px)' : 'none',
              }}
            >
              <path d="M12 2C6.486 2 2 6.486 2 12C2 17.514 6.486 22 12 22C12.7982 22 13.5803 21.9056 14.3399 21.7222C11.2954 20.6916 9 17.8575 9 14.5C9 10.3579 12.3579 7 16.5 7C18.2436 7 19.8417 7.53456 21.1471 8.45163C20.4161 4.99819 17.514 2 12 2Z"/>
            </svg>

            <svg 
              width={iconSize * 1.2}
              height={iconSize * 1.2}
              viewBox="0 0 24 24" 
              className={`absolute text-genesis-sun-yellow fill-current ${runBurstAnimation ? 'animate-sunBurstEffect' : 'transition-all duration-1000 ease-in-out'}`}
              style={{
                opacity: progress > 0.3 ? 1 : 0,
                transform: runBurstAnimation ? undefined : (progress >= 1 ? 'scale(1.2)' : `rotate(${progress * 360 - 180}deg) scale(${progress * 1.2})`),
                filter: progress > 0.7 || runBurstAnimation ? 'url(#sunGlowFilter)' : (progress > 0.5 ? 'blur(2px)' : 'blur(10px)'),
              }}
            >
              <circle cx="12" cy="12" r="5" className="fill-current text-genesis-sun-orange"/>
              {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                <line 
                  key={angle}
                  x1="12" y1="12"
                  x2={12 + 7 * Math.cos(angle * Math.PI / 180)}
                  y2={12 + 7 * Math.sin(angle * Math.PI / 180)}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="stroke-current text-genesis-sun-yellow"
                />
              ))}
               <circle 
                 cx="12"
                 cy="12"
                 r="3" 
                 className={`fill-current text-genesis-sun-glow ${runBurstAnimation ? 'animate-sunGlowBurstEffect' : ''}`}
                 style={{ 
                   transition: 'opacity 0.5s, transform 0.5s', 
                   opacity: runBurstAnimation ? undefined : (progress > 0.8 ? 0.7 : 0),
                   transform: runBurstAnimation ? undefined : (progress >=1 ? 'scale(1)' : 'scale(0.8)')
                  }}
               />
            </svg>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span 
              className={`text-2xl font-bold text-white transition-opacity duration-500 ${textClassName || ''}`}
              style={{ opacity: (progress > 0.05 && progress < 1) ? 1 : 0}}
            >
              {`${Math.round(progress * 100)}%`}
            </span>
            <span 
              className={`text-xs text-neutral-300 transition-opacity duration-500 ${textClassName || ''}`}
              style={{ opacity: (progress > 0.05 && progress < 1) ? 1 : 0}}
            >
              {`${currentHours.toFixed(1)} / ${goalHours} hrs`}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default SunMoonProgress; 