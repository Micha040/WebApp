import { ReactNode } from 'react';

type ModalProps = {
  title?: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}>
          ✖
        </button>

        {title && <h2 className="modal-title">{title}</h2>}

        {children}
      </div>
    </div>
  );
}
