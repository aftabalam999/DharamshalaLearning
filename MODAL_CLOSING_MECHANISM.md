# Universal Modal Closing Mechanism

This project now includes a universal modal closing mechanism that provides consistent ESC key and outside click handling across all modals.

## Features

- **ESC Key Support**: Press `Escape` to close any modal
- **Outside Click Support**: Click outside the modal content to close it
- **Automatic Cleanup**: Event listeners are properly cleaned up when modals close
- **Type Safe**: Full TypeScript support
- **Reusable**: Single hook works for all modals

## Usage

### Basic Usage

```tsx
import { useModal } from '../../hooks/useModal';

const MyComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { modalRef, contentRef, handleOutsideClick, handleContentClick } = useModal(
    isModalOpen,
    () => setIsModalOpen(false)
  );

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>Open Modal</button>

      {isModalOpen && (
        <div
          ref={modalRef}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleOutsideClick}
        >
          <div
            ref={contentRef}
            className="bg-white rounded-lg p-6"
            onClick={handleContentClick}
          >
            <h2>Modal Content</h2>
            <button onClick={() => setIsModalOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
};
```

### Modal Components

For modal components that receive an `onClose` prop:

```tsx
const ModalComponent = ({ onClose }) => {
  const { modalRef, contentRef, handleOutsideClick, handleContentClick } = useModal(true, onClose);

  return (
    <div ref={modalRef} onClick={handleOutsideClick}>
      <div ref={contentRef} onClick={handleContentClick}>
        Modal content
      </div>
    </div>
  );
};
```

## Implementation Details

- Uses `useEffect` to add/remove keyboard event listeners
- Uses `useRef` for DOM element references
- Prevents event bubbling on modal content clicks
- Automatically cleans up event listeners on unmount

## Updated Components

The following components have been updated to use this universal mechanism:

- `MentorMenteeReview` - Mentee review modal
- `StudentDashboard` - Performance review modal
- `MentorBrowser` - Mentor browsing modal

## Future Modals

All new modals should use this `useModal` hook for consistent behavior across the application.