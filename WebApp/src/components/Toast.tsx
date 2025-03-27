import { useEffect, useState } from 'react';

type ToastProps = {
  message: string;
  duration?: number; // in ms
  onClose: () => void;
};

export function Toast({ message, duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisible(false);
      onClose();
    }, duration);

    return () => clearTimeout(timeout);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#2ecc71',
        color: 'white',
        padding: '0.8rem 1.5rem',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        zIndex: 9999,
        animation: 'fadeIn 0.3s ease-in-out',
      }}
    >
      {message}
    </div>
  );
}
