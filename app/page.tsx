'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChatInterface } from '/components/chat/chat-interface';
import { ChatSidebar } from '/components/sidebar/chat-sidebar';
import { Button } from '/components/ui/button';
import { Menu, X } from 'lucide-react';

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8"
          >
            <Menu className="w-4 h-4" />
          </Button>
          
          <h1 className="font-semibold">AI Chat</h1>
          
          <div className="w-8" /> {/* Spacer */}
        </div>
      </div>

      {/* Sidebar */}
      <div className="hidden lg:block">
        <ChatSidebar isOpen={true} onClose={() => {}} />
      </div>
      
      {/* Mobile Sidebar */}
      <ChatSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        <div className="lg:hidden h-16" /> {/* Spacer for mobile header */}
        <ChatInterface />
      </div>
    </div>
  );
}