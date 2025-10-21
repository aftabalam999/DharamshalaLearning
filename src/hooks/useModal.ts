import { useEffect, useRef } from 'react';

/**
 * Custom hook for modal functionality that provides ESC key and outside click handling
 *
 * Usage:
 * ```tsx
 * const { modalRef, contentRef, handleOutsideClick, handleContentClick } = useModal(
 *   isModalOpen,
 *   () => setIsModalOpen(false)
 * );
 *
 * return (
 *   <div ref={modalRef} onClick={handleOutsideClick}>
 *     <div ref={contentRef} onClick={handleContentClick}>
 *       Modal content
 *     </div>
 *   </div>
 * );
 * ```
 *
 * @param isOpen - Whether the modal is currently open
 * @param onClose - Function to call when modal should be closed
 * @returns Object containing modal refs and handlers
 */
export const useModal = (isOpen: boolean, onClose: () => void) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isOpen, onClose]);

  // Handle outside click
  const handleOutsideClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === modalRef.current) {
      onClose();
    }
  };

  // Prevent modal content clicks from closing the modal
  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return {
    modalRef,
    contentRef,
    handleOutsideClick,
    handleContentClick,
  };
};