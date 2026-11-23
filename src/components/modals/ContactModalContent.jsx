import { useEffect, useRef, useState } from 'react';
import { STUDIO_CONTACT } from '../../config/portfolioData.js';

export function ContactModalContent() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopyEmail() {
    const email = STUDIO_CONTACT.email;
    let success = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(email);
        success = true;
      } catch {
        // Fallback below for restricted clipboard contexts
      }
    }

    if (!success) {
      const tempInput = document.createElement('textarea');
      tempInput.value = email;
      tempInput.style.position = 'fixed';
      tempInput.style.opacity = '0';
      document.body.appendChild(tempInput);
      tempInput.select();
      try {
        success = document.execCommand('copy');
      } catch (err) {
        console.warn('Copy fallback:', err);
      }
      document.body.removeChild(tempInput);
    }

    if (success) {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2200);
    }
  }

  return (
    <div className="space-y-6">
      <p className="font-serif text-lg sm:text-xl text-ink-soft leading-relaxed">
        Available for select interactive WebGL commissions, design-engineering leadership, and custom shader collaborations.
      </p>

      <div className="p-5 rounded-xl border border-ink/25 bg-paper-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink-muted">
            DIRECT ELECTRONIC POST
          </div>
          <div className="font-serif text-2xl text-ink mt-0.5 select-all">
            {STUDIO_CONTACT.email}
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopyEmail}
          className="px-5 py-2.5 rounded-full bg-ink text-paper-light hover:opacity-85 font-mono text-[11px] tracking-[0.18em] uppercase transition-opacity cursor-pointer whitespace-nowrap"
        >
          {copied ? 'COPIED TO CLIPBOARD' : 'COPY ADDRESS'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl border border-ink/15">
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-muted mb-1">
            AVAILABILITY
          </div>
          <div className="text-ink font-medium">{STUDIO_CONTACT.availability}</div>
        </div>
        <div className="p-4 rounded-xl border border-ink/15">
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-muted mb-1">
            CHANNELS
          </div>
          <div className="flex items-center gap-4 text-ink font-medium">
            <a
              href={STUDIO_CONTACT.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-70"
            >
              GitHub
            </a>
            <a
              href={STUDIO_CONTACT.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-70"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
