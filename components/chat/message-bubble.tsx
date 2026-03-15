'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Message } from '/lib/types';
import { Avatar, AvatarFallback } from '/components/ui/avatar';
import { Bot, MoreHorizontal, Check } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean; // optional: when true, we cap the rail at the bottom (no extension)
}

export function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;
  const [copied, setCopied] = useState(false);

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

  // Assistant message (left): includes vertical timeline rail that extends downward to connect with the next message
  if (!isUser) {
    // Extend the rail slightly below this row to visually connect to the next assistant item.
    // Tune the negative value if your vertical spacing changes.
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
          {/* Vertical rail: extends slightly below to connect with the next assistant row */}
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
          <div className="flex items-start justify-between w-full">
            <div className="flex-1 max-w-[85%] min-w-0">
              <div className="text-[15px] leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words font-normal">
                {message.content}
                {isStreaming && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                    className="inline-block w-2 h-4 ml-1 bg-current"
                  />
                )}
              </div>
            </div>

            {!isStreaming && (
              <button
                onClick={handleCopy}
                className="ml-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                aria-label="Copy message"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <MoreHorizontal className="w-4 h-4 text-gray-500" />
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // User message (right): separate from the timeline
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