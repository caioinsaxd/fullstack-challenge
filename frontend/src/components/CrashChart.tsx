import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';

import cloud1Svg from '../assets/cloud1.svg?url';
import cloud2Svg from '../assets/cloud2.svg?url';
import planet1Svg from '../assets/planet.svg?url';
import planet2Svg from '../assets/planet2.svg?url';
import ufoSvg from '../assets/ufo.svg?url';
import galaxySvg from '../assets/galaxy.svg?url';
import rocketPng from '../assets/foguetinho.png?url';

const CRASH_DISPLAY_DURATION = 1500;
const EXPLOSION_DURATION = 800;

interface BackgroundElement {
  type: 'cloud' | 'star' | 'planet' | 'ufo' | 'galaxy';
  zoneType?: string;
  x: number;
  y: number;
  speed: number;
  xSpeed: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  image: HTMLImageElement | null;
  color?: string;
}

export function CrashChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 337 });
  const [crashState, setCrashState] = useState<{
    crashed: boolean;
    crashTime: number;
    crashMultiplier: number;
    rocketX: number;
    rocketY: number;
  } | null>(null);
  const [waitingForRound, setWaitingForRound] = useState(false);
  const { crashPoint, currentRound, multiplier } = useGameStore();

  const cloud1Ref = useRef<HTMLImageElement | null>(null);
  const cloud2Ref = useRef<HTMLImageElement | null>(null);
  const planet1Ref = useRef<HTMLImageElement | null>(null);
  const planet2Ref = useRef<HTMLImageElement | null>(null);
  const ufoRef = useRef<HTMLImageElement | null>(null);
  const galaxyRef = useRef<HTMLImageElement | null>(null);
  const rocketRef = useRef<HTMLImageElement | null>(null);

  const elementsRef = useRef<BackgroundElement[]>([]);
  const movementLinesRef = useRef<{ x: number; y: number; length: number; speed: number; opacity: number }[]>([]);
  const currentZoneRef = useRef<string>('clouds');

  useEffect(() => {
    const updateDimensions = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth || 600,
          height: Math.floor((container.clientWidth || 600) * 9 / 16)
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const c1 = new Image();
    c1.src = cloud1Svg;
    c1.onload = () => { cloud1Ref.current = c1; };
    
    const c2 = new Image();
    c2.src = cloud2Svg;
    c2.onload = () => { cloud2Ref.current = c2; };
    
    const p1 = new Image();
    p1.src = planet1Svg;
    p1.onload = () => { planet1Ref.current = p1; };
    
    const p2 = new Image();
    p2.src = planet2Svg;
    p2.onload = () => { planet2Ref.current = p2; };
    
    const u = new Image();
    u.src = ufoSvg;
    u.onload = () => { ufoRef.current = u; };
    
    const g = new Image();
    g.src = galaxySvg;
    g.onload = () => { galaxyRef.current = g; };
    
    const r = new Image();
    r.src = rocketPng;
    r.onload = () => { rocketRef.current = r; };
  }, []);
  
  useEffect(() => {
    const isRunning = currentRound?.status === 'RUNNING';
    const hasCrashed = !!crashPoint;

    if (hasCrashed && !crashState) {
      const maxMultiplier = 20.0;
      const crashProgress = (crashPoint - 1) / (maxMultiplier - 1);
      const crashX = crashProgress * dimensions.width * 0.9 + dimensions.width * 0.05;
      const baseY = dimensions.height - 30;
      const crashY = baseY - crashProgress * (dimensions.height - 60);
      
      setCrashState({
        crashed: true,
        crashTime: Date.now(),
        crashMultiplier: crashPoint,
        rocketX: crashX,
        rocketY: crashY
      });
    } else if (!hasCrashed && isRunning && crashState) {
      setCrashState(null);
      setWaitingForRound(false);
    }
  }, [crashPoint, currentRound?.status, dimensions]);

  useEffect(() => {
    if (crashState && !waitingForRound) {
      const timer = setTimeout(() => {
        setWaitingForRound(true);
      }, CRASH_DISPLAY_DURATION);
      return () => clearTimeout(timer);
    }
  }, [crashState, waitingForRound]);

  const showExplosion = crashState && (Date.now() - crashState.crashTime) < EXPLOSION_DURATION;
const showCrashedLine = crashState && (Date.now() - crashState.crashTime) < CRASH_DISPLAY_DURATION;

  const initStars = useCallback(() => {
    const stars: BackgroundElement[] = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        type: 'star',
        zoneType: 'bg',
        x: Math.random() * 800,
        y: Math.random() * 600,
        speed: 0.1 + Math.random() * 0.2,
        xSpeed: 0.05,
        size: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.4,
        rotation: 0,
        rotationSpeed: 0,
        image: null,
        color: `hsl(${Math.random() * 60 + 200}, 70%, ${70 + Math.random() * 30}%)`
      });
    }
    return stars;
  }, []);

  const getMultiplierZone = () => {
    const m = multiplier;
    if (m < 2) return 'clouds';
    if (m < 4) return 'stars';
    if (m < 8) return 'planets';
    if (m < 12) return 'ufos';
    if (m < 16) return 'ufos';
    return 'galaxies';
  };

const spawnZoneElements = useCallback(() => {
    const zone = currentZoneRef.current;
    const maxPerZone = 3;
    
    elementsRef.current = elementsRef.current.filter(el => el.zoneType === 'bg' || el.zoneType === zone);
    
    const zoneElements = elementsRef.current.filter(el => el.zoneType === zone);
    if (zoneElements.length >= maxPerZone) return;
    
    const toAdd = maxPerZone - zoneElements.length;
    
    for (let i = 0; i < toAdd; i++) {
      const isCloud = zone === 'clouds';
      const isStar = zone === 'stars';
      const isPlanet = zone === 'planets';
      const isUfo = zone === 'ufos';
      const isGalaxy = zone === 'galaxies';
      
      if (isCloud) {
        const img = Math.random() > 0.5 ? cloud1Ref.current : cloud2Ref.current;
        elementsRef.current.push({
          type: 'cloud',
          zoneType: zone,
          x: Math.random() * dimensions.width,
          y: -100 - Math.random() * 300,
          speed: 0.6 + Math.random() * 0.4,
          xSpeed: 0.4 + Math.random() * 0.3,
          size: 50 + Math.random() * 40,
          opacity: 0.25 + Math.random() * 0.15,
          rotation: 0,
          rotationSpeed: 0,
          image: img
        });
      } else if (isStar) {
        elementsRef.current.push({
          type: 'star',
          zoneType: zone,
          x: Math.random() * dimensions.width,
          y: -100 - Math.random() * 300,
          speed: 0.8 + Math.random() * 0.5,
          xSpeed: 0.5 + Math.random() * 0.3,
          size: 15 + Math.random() * 20,
          opacity: 0.6 + Math.random() * 0.3,
          rotation: 0,
          rotationSpeed: 0,
          image: null,
          color: '#fbbf24'
        });
      } else if (isPlanet) {
        const img = Math.random() > 0.5 ? planet1Ref.current : planet2Ref.current;
        elementsRef.current.push({
          type: 'planet',
          zoneType: zone,
          x: Math.random() * dimensions.width,
          y: -100 - Math.random() * 300,
          speed: 0.5 + Math.random() * 0.3,
          xSpeed: 0.3 + Math.random() * 0.2,
          size: 35 + Math.random() * 25,
          opacity: 0.35 + Math.random() * 0.15,
          rotation: 0,
          rotationSpeed: 0,
          image: img
        });
      } else if (isUfo) {
        elementsRef.current.push({
          type: 'ufo',
          zoneType: zone,
          x: Math.random() * dimensions.width,
          y: -100 - Math.random() * 300,
          speed: 0.4 + Math.random() * 0.3,
          xSpeed: 0.25 + Math.random() * 0.2,
          size: 25 + Math.random() * 15,
          opacity: 0.4 + Math.random() * 0.2,
          rotation: 0,
          rotationSpeed: 0,
          image: ufoRef.current
        });
      } else if (isGalaxy) {
        elementsRef.current.push({
          type: 'galaxy',
          zoneType: zone,
          x: Math.random() * dimensions.width,
          y: -100 - Math.random() * 300,
          speed: 0.3 + Math.random() * 0.25,
          xSpeed: 0.2 + Math.random() * 0.15,
          size: 40 + Math.random() * 30,
          opacity: 0.35 + Math.random() * 0.15,
          rotation: 0,
          rotationSpeed: 0,
          image: galaxyRef.current
        });
      }
    }
  }, [dimensions]);

  useEffect(() => {
    elementsRef.current = initStars();
  }, [initStars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = dimensions.width * dpr;
      canvas.height = dimensions.height * dpr;
      ctx.scale(dpr, dpr);

      const gradient = ctx.createLinearGradient(0, 0, 0, dimensions.height);
      gradient.addColorStop(0, '#020617');
      gradient.addColorStop(1, '#0f172a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      ctx.strokeStyle = 'rgba(30, 41, 59, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < dimensions.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, dimensions.height);
        ctx.stroke();
      }
      for (let i = 0; i < dimensions.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(dimensions.width, i);
        ctx.stroke();
      }

const zone = getMultiplierZone();
      currentZoneRef.current = zone;
      
      if (currentRound?.status === 'RUNNING') {
        spawnZoneElements();
      }
      
      const currentElements = elementsRef.current.filter(el => {
        if (el.zoneType === 'bg') {
          el.y += el.speed;
          el.x -= el.xSpeed;
          if (el.y > dimensions.height) el.y = 0;
          if (el.x < 0) el.x = dimensions.width;
          ctx.save();
          ctx.globalAlpha = el.opacity;
          ctx.fillStyle = el.color || '#ffffff';
          ctx.beginPath();
          ctx.arc(el.x % dimensions.width, el.y % dimensions.height, el.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return true;
        }
        
        if (el.zoneType === 'stars') {
          el.y += el.speed;
          el.x -= el.xSpeed;
          if (el.y > dimensions.height + 50 || el.x < -50) return false;
          ctx.save();
          ctx.globalAlpha = el.opacity;
          ctx.fillStyle = el.color || '#fbbf24';
          ctx.beginPath();
          ctx.arc(el.x % dimensions.width, el.y % dimensions.height, el.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return true;
        }
        
        el.y += el.speed;
        el.x -= el.xSpeed;
        
        const isOffScreen = el.y > dimensions.height + 100 || el.x < -100;
        
        if (isOffScreen) return false;
        
        ctx.save();
        ctx.globalAlpha = el.opacity;
        
        if (el.image) {
          ctx.translate(el.x % dimensions.width, el.y % dimensions.height);
          ctx.drawImage(el.image, -el.size / 2, -el.size / 2, el.size, el.size);
        }
        
        ctx.restore();
        return true;
      });
      
      elementsRef.current = currentElements;

      const isRunning = currentRound?.status === 'RUNNING';
      const baseY = dimensions.height - 30;
      const maxMultiplier = 20.0;

      const currentProgress = crashState
        ? (crashState.crashMultiplier - 1) / (maxMultiplier - 1)
        : Math.min((multiplier - 1) / (maxMultiplier - 1), 0.9);
      
      const rocketX = currentProgress * dimensions.width * 0.9 + dimensions.width * 0.05;
      const rocketY = baseY - currentProgress * (dimensions.height - 60);
      
      const [_rocketHeight, _rocketWidth] = [60, 50];

      const lineCount = 5;
      while (movementLinesRef.current.length < lineCount) {
        movementLinesRef.current.push({
          x: Math.random() * dimensions.width,
          y: Math.random() * dimensions.height,
          length: 10 + Math.random() * 20,
          speed: 10 + Math.random() * 8,
          opacity: 0.15 + Math.random() * 0.2
        });
      }
      
      movementLinesRef.current = movementLinesRef.current.filter(line => {
        line.y += line.speed;
        line.x -= line.speed * 0.7;
        if (line.y > dimensions.height + 50 || line.x < -50) {
          line.x = Math.random() * dimensions.width;
          line.y = Math.random() * -50;
        }
        return true;
      });

      if (isRunning) {
        movementLinesRef.current.forEach(line => {
          ctx.save();
          ctx.globalAlpha = line.opacity;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(line.x, line.y);
          ctx.lineTo(line.x - line.length * 0.7, line.y + line.length);
          ctx.stroke();
          ctx.restore();
        });
      }

      if (isRunning) {
        ctx.strokeStyle = '#10b981';
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        const segments = 50;
        for (let i = 0; i <= segments; i++) {
          const segProgress = (i / segments) * currentProgress;
          const x = segProgress * dimensions.width * 0.9 + dimensions.width * 0.05;
          const y = baseY - segProgress * (dimensions.height - 60);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (showCrashedLine && crashState) {
        ctx.strokeStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        const segments = 50;
        const crashProgress = (crashState.crashMultiplier - 1) / (maxMultiplier - 1);
        for (let i = 0; i <= segments; i++) {
          const segProgress = (i / segments) * crashProgress;
          const x = segProgress * dimensions.width * 0.9 + dimensions.width * 0.05;
          const y = baseY - segProgress * (dimensions.height - 60);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        ctx.lineTo(dimensions.width, baseY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (showExplosion && crashState) {
        const explosionProgress = (Date.now() - crashState.crashTime) / EXPLOSION_DURATION;
        const explosionSize = 30 + explosionProgress * 50;
        
        ctx.fillStyle = '#f97316';
        ctx.globalAlpha = 1 - explosionProgress;
        ctx.beginPath();
        ctx.arc(crashState.rocketX, crashState.rocketY, explosionSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(crashState.rocketX, crashState.rocketY, explosionSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(crashState.rocketX, crashState.rocketY, explosionSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1;
      } else if (isRunning || (showCrashedLine && crashState)) {
        const posX = crashState ? crashState.rocketX : rocketX;
        const posY = crashState ? crashState.rocketY : rocketY;
        
        // Draw rocket from PNG image
        if (rocketRef.current) {
          const rocketWidth = 50;
          const rocketHeight = 50;
          ctx.save();
          ctx.translate(posX, posY);
          // Minimal rotation to the right
          ctx.rotate(Math.PI / 20);
          ctx.drawImage(rocketRef.current, -rocketWidth/2, -rocketHeight/2, rocketWidth, rocketHeight);
          ctx.restore();
        }
      }
    };

    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [crashPoint, currentRound, multiplier, dimensions, crashState, showExplosion, showCrashedLine]);

  const getStatusBadge = () => {
    // After crash - show CRASHED briefly then transition to PLACE BETS
    if (showExplosion || showCrashedLine) {
      return { text: 'CRASHED', class: 'ended' };
    }
    
    const status = currentRound?.status;
    
    // Map API statuses to display
    const statusMap: Record<string, { text: string; class: string }> = {
      BETTING: { text: 'PLACE BETS', class: 'betting' },
      RUNNING: { text: 'FLYING', class: 'running' },
      ENDED: { text: 'CRASHED', class: 'ended' },
      SETTLED: { text: 'CRASHED', class: 'ended' },
    };
    
    // Default to PLACE BETS if no round or unknown status
    // This ensures we always show a meaningful status
    if (!status || status === 'BETTING') {
      return { text: 'PLACE BETS', class: 'betting' };
    }
    
    return statusMap[status] || { text: 'PLACE BETS', class: 'betting' };
  };

  const statusConfig = getStatusBadge();

// Timer: synced with round timing - shows 10s countdown during BETTING phase
  const [countdown, setCountdown] = useState<number>(10);
  const [showTimer, setShowTimer] = useState(false);
  const [showBetsOff, setShowBetsOff] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const store = useGameStore.getState();
      const round = store.currentRound;
      const status = round?.status;
      const bettingEndsAt = store.bettingEndsAt;
      
      // Only show timer during BETTING phase
      if (status === 'BETTING' && bettingEndsAt) {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((bettingEndsAt - now) / 1000));
        
        if (remaining > 0 && remaining <= 10) {
          // Show countdown 10 to 1
          setCountdown(remaining);
          setShowTimer(true);
          setShowBetsOff(false);
        } else if (remaining === 0) {
          // Show "BETS ARE OFF" for 5 seconds (15s total betting - 10s visual timer)
          setShowTimer(false);
          setShowBetsOff(true);
          
          // Auto-hide after 5 seconds (fade out)
          setTimeout(() => {
            setShowBetsOff(false);
          }, 4500);
        }
      } else {
        // Not in BETTING phase - hide everything
        setShowTimer(false);
        setShowBetsOff(false);
      }
    }, 250);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel" style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ width: '100%', height: '100%' }}
      />
      <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className={(showExplosion || showCrashedLine) ? 'multiplier crashed' : 'multiplier'}>
          {(crashState?.crashMultiplier || crashPoint || multiplier).toFixed(2)}x
        </div>
        <div className={`status-badge ${statusConfig.class}`}>
          {statusConfig.text}
        </div>
      </div>
      {/* Centered countdown timer */}
      {showTimer && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '8rem',
          fontWeight: 'bold',
          color: '#ffffff',
          textShadow: '0 0 20px rgba(0,0,0,0.9)',
          opacity: countdown <= 3 ? 1 : 0.95,
          zIndex: 100,
        }}>
          {countdown}
        </div>
      )}
      
      {/* BETS ARE OFF message */}
      {showBetsOff && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '4.5rem',
          fontWeight: 'bold',
          color: '#ef4444',
          textShadow: '0 0 30px rgba(239, 68, 68, 0.8)',
          zIndex: 100,
          fontFamily: 'Orbitron, sans-serif',
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
          animation: 'fade-in-out 5s ease-in-out forwards',
        }}>
          BETS ARE OFF
        </div>
      )}
    </div>
  );
}