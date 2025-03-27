import { ReactNode } from 'react';

type ModalProps = {
  title?: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: '#1e1e1e',
          padding: '2rem',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '400px',
          color: '#fff',
          boxShadow: '0 0 20px rgba(0,0,0,0.3)',
          position: 'relative',
        }}
      >
        {/* ❌ Schließen-Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.8rem',
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '1.2rem',
            cursor: 'pointer',
          }}
        >
          ✖
        </button>

        {title && <h2 style={{ marginBottom: '1rem' }}>{title}</h2>}

        {children}
      </div>
    </div>
  );
}
