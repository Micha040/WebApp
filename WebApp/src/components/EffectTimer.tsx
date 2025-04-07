import React from 'react';

type Effect = {
  type: 'shield' | 'speed' | 'damage';
  endTime: number;
  slot: number;
};

type EffectTimerProps = {
  effect: Effect;
};

const EffectTimer: React.FC<EffectTimerProps> = ({ effect }) => {
  const [timeLeft, setTimeLeft] = React.useState<number>(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, effect.endTime - Date.now());
      setTimeLeft(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [effect.endTime]);

  const seconds = Math.ceil(timeLeft / 1000);
  
  if (timeLeft <= 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '-20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: getEffectColor(effect.type),
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '12px',
      whiteSpace: 'nowrap'
    }}>
      {seconds}s
    </div>
  );
};

const getEffectColor = (type: Effect['type']): string => {
  switch (type) {
    case 'shield':
      return '#3498db';  // Blau
    case 'speed':
      return '#2ecc71';  // Grün
    case 'damage':
      return '#e74c3c';  // Rot
    default:
      return 'white';
  }
};

export default EffectTimer; 