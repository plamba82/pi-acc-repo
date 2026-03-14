'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '/lib/store/chat-store';
import { Button } from '/components/ui/button';
import { ScrollArea } from '/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2, Edit3 } from 'lucide-react';
import { cn, formatTimestamp } from '/lib/utils';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const {
    sessions,
    currentSessionId,
    currentAgentId,
    agents,
    createSession,
    setCurrentSession,
    deleteSession,
    updateSessionTitle,
  } = useChatStore();

  const currentAgent = agents.find(a => a.id === currentAgentId);

  const handleNewChat = () => {
    createSession(currentAgentId);
    onClose();
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSession(sessionId);
    onClose();
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession(sessionId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-80 bg-background/95 backdrop-blur-xl border-r border-border/50 z-50 lg:relative lg:translate-x-0"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Chats</h2>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleNewChat}
                    className="w-8 h-8 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Current Agent */}
                {currentAgent && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl">{currentAgent.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{currentAgent.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {currentAgent.description}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat List */}
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {sessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No chats yet</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {sessions.map((session) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            'group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                            'hover:bg-muted/50',
                            currentSessionId === session.id && 'bg-muted'
                          )}
                          onClick={() => handleSelectSession(session.id)}
                        >
                          <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {session.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatTimestamp(session.updatedAt)}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              className="w-6 h-6 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}