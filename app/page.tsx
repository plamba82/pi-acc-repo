'use client';

import React from 'react';
import { ChatInterface } from '/components/chat/chat-interface';
import { Button } from '/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';

function setTheme(theme: string) {
  if (typeof window !== 'undefined') {
    document.documentElement.classList.remove('light', 'dark');
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
      localStorage.setItem('theme', 'system');
    } else {
      document.documentElement.classList.add(theme);
      localStorage.setItem('theme', theme);
    }
  }
}

export default function HomePage() {
  const [theme, setThemeState] = React.useState('system');

  React.useEffect(() => {
    const saved = localStorage.getItem('theme') || 'system';
    setTheme(saved);
    setThemeState(saved);
  }, []);

  const handleThemeChange = (theme: string) => {
    setTheme(theme);
    setThemeState(theme);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">AI Commerce</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant={theme === 'light' ? 'apple' : 'ghost'}
            aria-label="Light mode"
            onClick={() => handleThemeChange('light')}
          >
            <Sun className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            variant={theme === 'dark' ? 'apple' : 'ghost'}
            aria-label="Dark mode"
            onClick={() => handleThemeChange('dark')}
          >
            <Moon className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            variant={theme === 'system' ? 'apple' : 'ghost'}
            aria-label="System mode"
            onClick={() => handleThemeChange('system')}
          >
            <Monitor className="w-5 h-5" />
          </Button>
        </div>
      </header>
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        <ChatInterface />
      </main>
    </div>
  );
}