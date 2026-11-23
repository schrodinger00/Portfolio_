import { memo } from 'react';
import { MODAL_HEADERS } from '../../config/portfolioData.js';
import { ProjectsModalContent } from './ProjectsModalContent.jsx';
import { ArtworkModalContent } from './ArtworkModalContent.jsx';
import { AboutModalContent } from './AboutModalContent.jsx';
import { ContactModalContent } from './ContactModalContent.jsx';

export const EditorialModal = memo(function EditorialModal({
  activeModal,
  onClose,
  artworkPreviews,
  onSwapCardFromModal,
}) {
  if (!activeModal) return null;
  const header = MODAL_HEADERS[activeModal];
  if (!header) return null;

  return (
    <div
      id="ModalBackdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ModalTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 backdrop-blur-xs p-4 sm:p-6"
    >
      <div
        id="ModalDialog"
        className="relative w-full max-w-3xl max-h-[86vh] rounded-2xl bg-paper-light border border-ink/60 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-ink/15">
          <div>
            <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-ink-muted">
              {header.eyebrow}
            </div>
            <h2
              id="ModalTitle"
              className="font-serif text-2xl sm:text-3xl tracking-[0.1em] uppercase text-ink mt-0.5"
            >
              {header.title}
            </h2>
          </div>
          <button
            type="button"
            id="CloseModalBtn"
            aria-label="Close Overlay"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-ink/25 flex items-center justify-center text-ink hover:bg-ink hover:text-paper-light transition-colors cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 2L12 12M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Modal Dynamic Content Container */}
        <div className="archival-scroll flex-1 overflow-y-auto px-6 sm:px-8 py-6 text-ink">
          {activeModal === 'projects' && <ProjectsModalContent />}
          {activeModal === 'artwork' && (
            <ArtworkModalContent
              previews={artworkPreviews}
              onSwapCard={onSwapCardFromModal}
            />
          )}
          {activeModal === 'about' && <AboutModalContent />}
          {activeModal === 'contact' && <ContactModalContent />}
        </div>
      </div>
    </div>
  );
});
