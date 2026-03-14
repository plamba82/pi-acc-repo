'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '/components/ui/button';
import { Send, Square } from 'lucide-react';
import { cn } from '/lib/utils';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  disabled = false,
  placeholder = 'Type your message...',
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled && !isStreaming) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // 5 lines approximately
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border/50 p-4"
    >
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end gap-3 p-3 bg-background rounded-2xl apple-shadow border border-border/50">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                'flex-1 resize-none bg-transparent border-0 outline-none text-sm leading-relaxed',
                'placeholder:text-muted-foreground',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'max-h-[120px] overflow-y-auto'
              )}
              style={{ minHeight: '24px' }}
            />
            
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onStopStreaming}
                className="shrink-0 w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
              >
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                variant="apple"
                disabled={!message.trim() || disabled}
                className="shrink-0 w-8 h-8 rounded-lg"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </motion.div>
  );
}