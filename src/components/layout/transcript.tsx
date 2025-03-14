import { cn } from "@/lib/utils";
import { useAgent } from "@/hooks/use-agent";
import { useEffect, useRef, RefObject, useState } from "react";
import * as fs from 'fs';

export function Transcript({
  scrollContainerRef,
  scrollButtonRef,
}: {
  scrollContainerRef: RefObject<HTMLElement>;
  scrollButtonRef: RefObject<HTMLButtonElement>;
}) {
  const { displayTranscriptions } = useAgent();
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const calculateDistanceFromBottom = (container: HTMLElement) => {
    const { scrollHeight, scrollTop, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight;
  };

  const handleScrollVisibility = (
    container: HTMLElement,
    scrollButton: HTMLButtonElement,
  ) => {
    const distanceFromBottom = calculateDistanceFromBottom(container);
    const shouldShowButton = distanceFromBottom > 100;
    setShowScrollButton(shouldShowButton);
    scrollButton.style.display = shouldShowButton ? "flex" : "none";
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    const scrollButton = scrollButtonRef.current;
    if (container && scrollButton) {
      const handleScroll = () =>
        handleScrollVisibility(container, scrollButton);

      handleScroll(); // Check initial state
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [
    scrollContainerRef,
    scrollButtonRef,
    displayTranscriptions,
    handleScrollVisibility,
  ]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const distanceFromBottom = calculateDistanceFromBottom(container);
      const isNearBottom = distanceFromBottom < 100;

      if (isNearBottom) {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [displayTranscriptions, scrollContainerRef, transcriptEndRef]);

  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const scrollButton = scrollButtonRef.current;
    if (scrollButton) {
      scrollButton.addEventListener("click", scrollToBottom);
      return () => scrollButton.removeEventListener("click", scrollToBottom);
    }
  }, [scrollButtonRef]);

  return (
    <>
      <div className="flex items-center text-xs font-semibold uppercase tracking-widest sticky top-0 left-0 bg-white w-full p-4">
        Transcript
      </div>
      <div className="p-4 min-h-[300px] relative">
        {displayTranscriptions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-300 text-sm">
            Get talking to start the conversation!
          </div>
        ) : (
          <div className="space-y-4">
            {displayTranscriptions.map(
              ({ segment, participant, publication }) =>
                segment.text.trim() !== "" && (
                  <div
                    key={segment.id}
                    className={cn(
                      "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                      participant?.isAgent
                        ? "bg-neutral-100 text-[#09090B]"
                        : "ml-auto border border-neutral-300",
                    )}
                  >
                    {segment.text.trim()}
                  </div>
                ),
            )}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>
    </>
  );
}

// New TranscriptNoShow component for silent transcript management
export function TranscriptNoShow({
  autoSaveInterval = 5000, // Save every 5 seconds by default
  filePath = `conversation-${Date.now()}.txt`,
}: {
  autoSaveInterval?: number;
  filePath?: string;
}) {
  const { displayTranscriptions } = useAgent();
  const transcriptRef = useRef<string>('');
  
  // Update transcript content whenever new messages arrive
  useEffect(() => {
    if (displayTranscriptions.length > 0) {
      console.log(`[TranscriptNoShow] Processing ${displayTranscriptions.length} transcriptions`);
      
      let transcriptText = "CONVERSATION TRANSCRIPT\n";
      transcriptText += "=======================\n\n";
      transcriptText += `Date: ${new Date().toLocaleString()}\n`;
      transcriptText += `Total exchanges: ${displayTranscriptions.length}\n\n`;
      
      displayTranscriptions.forEach(({ segment, participant }, index) => {
        if (segment.text.trim() !== "") {
          const speaker = participant?.isAgent ? 'AI' : 'User';
          transcriptText += `[${new Date(segment.firstReceivedTime || Date.now()).toISOString()}] ${speaker}: ${segment.text.trim()}\n\n`;
          
          // Only log new messages
          if (index >= displayTranscriptions.length - 1) {
            console.log(`[TranscriptNoShow] New message: ${speaker}: ${segment.text.trim().substring(0, 50)}${segment.text.trim().length > 50 ? '...' : ''}`);
          }
        }
      });
      
      // Store the formatted transcript
      transcriptRef.current = transcriptText;
      console.log(`[TranscriptNoShow] Updated transcript (${displayTranscriptions.length} messages, ~${transcriptText.length} chars)`);
      
      // Make transcript available globally for external access
      if (typeof window !== 'undefined') {
        (window as any).__latestTranscript = transcriptText;
        (window as any).__getTranscript = () => transcriptRef.current;
      }
      
      // Save to local storage for persistence across page loads
      try {
        localStorage.setItem('erp-transcript', transcriptRef.current);
        console.log(`[TranscriptNoShow] Transcript updated in local storage (${displayTranscriptions.length} messages, ${transcriptRef.current.length} bytes)`);
      } catch (e) {
        console.error('[TranscriptNoShow] Failed to save transcript to local storage:', e);
      }
    }
  }, [displayTranscriptions]);

  // Expose functions to explicitly save the transcript
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Function to trigger a download of the current transcript
      (window as any).downloadTranscript = (customFilename?: string) => {
        try {
          const filename = customFilename || `conversation-${Date.now()}.txt`;
          console.log(`[TranscriptNoShow] downloadTranscript called with filename: ${filename}`);
          
          const blob = new Blob([transcriptRef.current], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          console.log(`[TranscriptNoShow] Transcript downloaded as ${filename} (${transcriptRef.current.length} bytes)`);
          return true;
        } catch (e) {
          console.error('[TranscriptNoShow] Failed to download transcript:', e);
          return false;
        }
      };
      
      // Function to get the transcript as text
      (window as any).getTranscriptText = () => {
        console.log(`[TranscriptNoShow] getTranscriptText called, returning ${transcriptRef.current.length} bytes`);
        return transcriptRef.current;
      };
    }
    
    return () => {
      // Clean up global functions when component unmounts
      if (typeof window !== 'undefined') {
        console.log('[TranscriptNoShow] Removing global transcript accessors');
        delete (window as any).downloadTranscript;
        delete (window as any).getTranscriptText;
        delete (window as any).__latestTranscript;
        delete (window as any).__getTranscript;
      }
    };
  }, []);
  
  // Component doesn't render anything visible
  return null;
}

export function forceSaveTranscript(filename?: string): boolean {
  console.log(`[forceSaveTranscript] Called with filename: ${filename || 'default'}`);
  if (typeof window !== 'undefined' && (window as any).downloadTranscript) {
    const result = (window as any).downloadTranscript(filename);
    console.log(`[forceSaveTranscript] Result: ${result}`);
    return result;
  }
  console.log('[forceSaveTranscript] downloadTranscript function not available');
  return false;
}

export function getTranscriptContent(): string {
  console.log('[getTranscriptContent] Called');
  
  // First try to get from window function
  if (typeof window !== 'undefined' && (window as any).getTranscriptText) {
    try {
      const content = (window as any).getTranscriptText();
      console.log(`[getTranscriptContent] Got from window function: ${content?.length || 0} chars`);
      if (content && content.length > 0) {
        return content;
      }
    } catch (e) {
      console.error('[getTranscriptContent] Error using window.getTranscriptText:', e);
    }
  }
  
  // Second try to get from localStorage
  if (typeof window !== 'undefined') {
    try {
      const storedTranscript = localStorage.getItem('erp-transcript');
      console.log(`[getTranscriptContent] Got from localStorage: ${storedTranscript?.length || 0} chars`);
      if (storedTranscript && storedTranscript.length > 0) {
        return storedTranscript;
      }
    } catch (e) {
      console.error('[getTranscriptContent] Error getting transcript from localStorage:', e);
    }
  }
  
  console.log('[getTranscriptContent] No transcript found in any source');
  return '';
}
