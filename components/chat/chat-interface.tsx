'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '/lib/store/chat-store';
import { wsService } from '/lib/services/websocket';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { ScrollArea } from '/components/ui/scroll-area';
import { Button } from '/components/ui/button';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '/lib/utils';

export function ChatInterface() {
  const {
    sessions,
    currentSessionId,
    currentAgentId,
    isStreaming,
    connectionStatus,
    addMessage,
    setStreaming,
    createSession,
    consoleLogs,
    addConsoleLog,
  } = useChatStore();

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  useEffect(() => {
    const initializeConnection = async () => {
      try {
        await wsService.connect();
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      }
    };

    initializeConnection();

    return () => {
      wsService.disconnect();
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!wsService.isConnected()) {
      console.error('WebSocket not connected');
      return;
    }

    let sessionId = currentSessionId;
    
    // Create new session if none exists
    if (!sessionId) {
      sessionId = createSession(currentAgentId, 'New Chat');
    }

    const aiMessageId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
 // 1. Add user message (unique id, not streaming)
    addMessage({
      id: aiMessageId,
      content,
      role: 'user',
    });

    // Add user message
    addMessage({
      id: aiMessageId,
      content: '',
      role: 'assistant',
      isStreaming: true,
    });


    setStreaming(true);

    try {
      wsService.sendMessage(content, sessionId, currentAgentId, aiMessageId);
      console.log('[Console] Sent:', content, sessionId, aiMessageId );
    } catch (error) {
      console.error('Failed to send message:', error);
      setStreaming(false);
    }
  };

  const handleStopStreaming = () => {
    setStreaming(false);
  };

  const handleReconnect = async () => {
    try {
      await wsService.connect();
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Connection Status */}
      <AnimatePresence>
        {connectionStatus !== 'connected' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              'flex items-center justify-between px-4 py-2 text-sm',
              connectionStatus === 'connecting' 
                ? 'bg-yellow-50 text-yellow-800 border-b border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200'
                : 'bg-red-50 text-red-800 border-b border-red-200 dark:bg-red-950 dark:text-red-200'
            )}
          >
            <div className="flex items-center gap-2">
              {connectionStatus === 'connecting' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              <span>
                {connectionStatus === 'connecting' ? 'Connecting...' : 'Connection lost'}
              </span>
            </div>
            
            {connectionStatus === 'disconnected' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReconnect}
                className="h-6 px-2 text-xs"
              >
                Reconnect
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="min-h-full">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-center p-8"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 apple-shadow-lg">
                <Wifi className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Start a conversation
              </h3>
              <p className="text-muted-foreground max-w-md">
                Ask me anything! I'm here to help with your questions and tasks.
              </p>
            </motion.div>
          ) : (
            <div className="py-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLast={index === messages.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Console Log Area */}
      <div className="max-w-4xl mx-auto w-full px-4 py-2">
        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2 text-xs font-mono text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 max-h-40 overflow-y-auto">
          <div className="mb-1 font-bold text-gray-500 dark:text-gray-400">Console Log</div>
          {messages.length === 0 ? (
            <div className="text-gray-400">No console messages yet.</div>
          ) : (
            messages.map((log, idx) => (
              <div key={idx}>
                <span className={log.direction === 'sent' ? 'text-blue-600' : 'text-green-600'}>
                  [{log.direction === 'sent' ? 'Sent' : 'Received'}]
                </span>{' '}
                <span className="text-gray-500">{log.timestamp.toLocaleTimeString()}:</span>{' '}
                <span>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        isStreaming={isStreaming}
        onStopStreaming={handleStopStreaming}
        disabled={connectionStatus !== 'connected'}
        placeholder={
          connectionStatus !== 'connected'
            ? 'Connecting...'
            : 'Type your message...'
        }
      />
    </div>
  );
}