import { useEffect, useState } from 'react';

type ToastProps = {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
};

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisible(false);
      onClose();
    }, duration);

    return () => clearTimeout(timeout);
  }, [duration, onClose]);

  if (!visible) return null;

  const background = {
    success: 'var(--success-color)',
    error: 'var(--error-color)',
    info: 'var(--primary-color)',
  }[type];

  return (
    <div
      className="toast"
      style={{
        backgroundColor: background,
      }}
    >
      {message}
    </div>
  );
}
