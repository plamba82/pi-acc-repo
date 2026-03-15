'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Message } from '/lib/types';
import { Avatar, AvatarFallback } from '/components/ui/avatar';
import { Bot, MoreHorizontal, Check, ChevronDown } from 'lucide-react';
import { StreamingText } from './streaming-text';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean; // optional: when true, we cap the rail at the bottom (no extension)
}

export function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  const [copied, setCopied] = useState(false);

  // Scroll-hint state for assistant messages
  const endSentinelRef = useRef<HTMLSpanElement | null>(null);
  const [needsScrollHint, setNeedsScrollHint] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatTime = (timestamp?: Date) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Observe whether the end of the assistant message is visible in the viewport.
  useEffect(() => {
    if (isUser) return; // Only for assistant messages
    const sentinel = endSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setNeedsScrollHint(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 1,
        rootMargin: '0px 0px -8px 0px'
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isUser, message.content, isStreaming]);

  const scrollToEnd = () => {
    endSentinelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  // Assistant message (left): includes vertical timeline rail that extends downward to connect with the next message
  if (!isUser) {
    const bottomExtendClass = isLast ? 'bottom-0' : 'bottom-[-18px]';

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative flex gap-3 max-w-4xl mx-auto px-6 py-4"
      >
        {/* Timeline rail + avatar column */}
        <div className="relative w-8 shrink-0 flex justify-center">
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 ${bottomExtendClass} w-px bg-gray-200 dark:bg-gray-700`}
          />
          <Avatar className="w-8 h-8 relative z-10">
            <AvatarFallback className="bg-blue-600 text-white">
              <Bot className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Content column */}
        <div className="flex flex-col w-full min-w-0">
          <div className="flex items-start w-full">
            <div className="flex-1 max-w-[100%] min-w-0">
              <div className="relative">
                <StreamingText
                  text={message.content}
                  isStreaming={!!isStreaming}
                  charsPerFrame={32}
                  className="text-[15px] leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words font-normal"
                />
                {isStreaming && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                    className="inline-block w-2 h-4 ml-1 bg-current"
                  />
                )}
                {/* Sentinel marks the very end of the assistant message */}
                <span ref={endSentinelRef} aria-hidden="true" />

                {/* Copy action placed at the end of the message (only when not streaming) */}
                {!isStreaming && (
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
                      aria-label="Copy message"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Downward scroll hint (appears when the message extends below the viewport) */}
                {needsScrollHint && (
                  <div className="sticky bottom-6 z-20 mt-6 flex w-full justify-center">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-white dark:to-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={scrollToEnd}
                      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-md ring-1 ring-black/10 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                      aria-label="Show the rest of the message"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // User message (right): separate from the timeline (no copy button)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex justify-end max-w-4xl mx-auto px-6 py-3"
    >
      <div className="flex flex-col max-w-[80%] items-end">
        <div
          className="
            rounded-tl-[12px] rounded-bl-[12px] rounded-br-[12px] rounded-tr-none
            px-6 py-4
            bg-[#1977F3]
            text-white
            shadow-[0_8px_18px_rgba(25,119,243,0.35)]
          "
          aria-live="polite"
          aria-label="Your message"
        >
          <p className="text-[15px] md:text-[20px] leading-[1.55] whitespace-pre-wrap break-words font-normal">
            {message.content}
          </p>
        </div>

        <time
          className="mt-1 pr-1 text-[11px] leading-4 text-gray-400 dark:text-gray-500"
          dateTime={message.timestamp ? new Date(message.timestamp).toISOString() : undefined}
          aria-label={`Sent at ${formatTime(message.timestamp)}`}
        >
          {formatTime(message.timestamp)}
        </time>
      </div>
    </motion.div>
  );
}