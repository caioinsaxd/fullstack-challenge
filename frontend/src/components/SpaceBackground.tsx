import { useEffect, useState } from 'react';

interface SpaceItem {
  id: number;
  type: 'planet' | 'planet2' | 'planet-red' | 'asteroid' | 'ufo' | 'saturn' | 'comet';
  x: number;
  y: number;
  size: number;
  floatClass: string;
}

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

// Original positions preserved
const spaceItems: SpaceItem[] = [
  { id: 1, type: 'planet', x: 15, y: 70, size: 120, floatClass: 'float-1' },
  { id: 2, type: 'planet2', x: 75, y: 20, size: 80, floatClass: 'float-2' },
  { id: 3, type: 'asteroid', x: 60, y: 75, size: 60, floatClass: 'float-1' },
  { id: 4, type: 'asteroid', x: 25, y: 30, size: 40, floatClass: 'float-3' },
  { id: 5, type: 'ufo', x: 85, y: 60, size: 50, floatClass: '' },
  { id: 6, type: 'planet2', x: 5, y: 50, size: 50, floatClass: 'float-2' },
  
  // Additional items - NEW
  { id: 7, type: 'saturn', x: 55, y: 85, size: 55, floatClass: 'float-2' },
  { id: 8, type: 'comet', x: 35, y: 85, size: 30, floatClass: 'float-1' },
  { id: 9, type: 'planet', x: 45, y: 10, size: 35, floatClass: 'float-3' },
  { id: 10, type: 'asteroid', x: 70, y: 45, size: 25, floatClass: 'float-2' },
  { id: 11, type: 'ufo', x: 10, y: 25, size: 30, floatClass: 'float-1' },
  { id: 12, type: 'saturn', x: 90, y: 85, size: 40, floatClass: 'float-3' },
  { id: 13, type: 'comet', x: 20, y: 60, size: 25, floatClass: 'float-2' },
  { id: 14, type: 'planet-red', x: 90, y: 35, size: 60, floatClass: 'float-1' },
];

export function SpaceBackground() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const generatedStars: Star[] = [];
    for (let i = 0; i < 100; i++) {
      generatedStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 3,
      });
    }
    setStars(generatedStars);
  }, []);

  const getSvgContent = (type: string) => {
    switch (type) {
      case 'planet':
        return (
          <svg viewBox="0 0 100 100" className="space-item planet">
            <defs>
              <linearGradient id="planetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#planetGrad)" />
            <ellipse cx="50" cy="50" rx="45" ry="15" fill="none" stroke="rgba(255,255,255,0.2)" transform="rotate(-20 50 50)" />
            <circle cx="35" cy="40" r="8" fill="rgba(255,255,255,0.15)" />
            <circle cx="60" cy="60" r="5" fill="rgba(255,255,255,0.1)" />
          </svg>
        );
      case 'planet-red':
        return (
          <svg viewBox="0 0 100 100" className="space-item planet">
            <defs>
              <linearGradient id="planetRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#f87171" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#planetRedGrad)" />
            <ellipse cx="50" cy="50" rx="45" ry="15" fill="none" stroke="rgba(255,255,255,0.2)" transform="rotate(-20 50 50)" />
            <circle cx="35" cy="40" r="8" fill="rgba(255,255,255,0.15)" />
            <circle cx="60" cy="60" r="5" fill="rgba(255,255,255,0.1)" />
          </svg>
        );
      case 'planet2':
        return (
          <svg viewBox="0 0 100 100" className="space-item planet2">
            <defs>
              <linearGradient id="planet2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#planet2Grad)" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <ellipse cx="30" cy="50" rx="15" ry="25" fill="rgba(0,0,0,0.3)" transform="rotate(-30 30 50)" />
          </svg>
        );
      case 'saturn':
        return (
          <svg viewBox="0 0 100 100" className="space-item planet2">
            <defs>
              <linearGradient id="saturnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="35" fill="url(#saturnGrad)" />
            <ellipse cx="50" cy="50" rx="45" ry="12" fill="none" stroke="rgba(236, 72, 153, 0.5)" strokeWidth="3" />
            <circle cx="40" cy="40" r="5" fill="rgba(255,255,255,0.2)" />
          </svg>
        );
      case 'comet':
        return (
          <svg viewBox="0 0 100 100" className="space-item planet">
            <defs>
              <linearGradient id="cometGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle cx="70" cy="30" r="12" fill="#22d3ee" />
            <circle cx="70" cy="30" r="8" fill="#67e8f9" />
            <path d="M70 30 L20 80" stroke="url(#cometGrad)" strokeWidth="6" strokeLinecap="round" />
            <path d="M68 32 L25 75" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'asteroid':
        return (
          <svg viewBox="0 0 100 100" className="space-item asteroid">
            <defs>
              <linearGradient id="asteroidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6b7280" />
                <stop offset="100%" stopColor="#374151" />
              </linearGradient>
            </defs>
            <path d="M50 10 Q70 5 80 25 Q90 40 80 60 Q75 80 55 85 Q35 90 20 70 Q10 50 25 30 Q35 15 50 10" fill="url(#asteroidGrad)" />
            <circle cx="40" cy="35" r="3" fill="rgba(0,0,0,0.3)" />
            <circle cx="55" cy="50" r="2" fill="rgba(0,0,0,0.2)" />
            <circle cx="45" cy="60" r="2" fill="rgba(0,0,0,0.2)" />
          </svg>
        );
      case 'ufo':
        return (
          <svg viewBox="0 0 100 100" className="space-item ufo">
            <ellipse cx="50" cy="70" rx="35" ry="10" fill="#10b981" opacity="0.8" />
            <ellipse cx="50" cy="65" rx="30" ry="8" fill="#059669" />
            <ellipse cx="50" cy="55" rx="20" ry="15" fill="#1e293b" />
            <ellipse cx="50" cy="50" rx="15" ry="12" fill="#374151" />
            <ellipse cx="50" cy="45" rx="8" ry="8" fill="#10b981" opacity="0.5">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
            </ellipse>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="game-container">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
      
      {spaceItems.map((item) => (
        <div
          key={item.id}
          className={`space-item ${item.floatClass}`}
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: item.size,
            height: item.size,
          }}
        >
          {getSvgContent(item.type)}
        </div>
      ))}
    </div>
  );
}