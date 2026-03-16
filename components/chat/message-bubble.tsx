'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Message } from '/lib/types';
import { cn, formatTimestamp } from '/lib/utils';
import { Avatar, AvatarFallback } from '/components/ui/avatar';
import { Bot, User } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
}

export function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex gap-3 max-w-4xl mx-auto px-4 py-6',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className={cn(
          'text-xs font-medium',
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
        )}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={cn(
        'flex flex-col gap-1 max-w-[80%]',
        isUser ? 'items-end' : 'items-start'
      )}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-blue-500 text-white apple-shadow'
            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 apple-shadow',
          isStreaming && 'animate-pulse'
        )}>
          <div className="whitespace-pre-wrap break-words">
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
        
        <span className="text-xs text-muted-foreground px-2">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}