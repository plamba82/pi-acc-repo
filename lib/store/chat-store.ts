import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ChatState, Message, ChatSession, AIAgent } from '/lib/types';
import { generateId } from '/lib/utils';

interface ConsoleLog {
  timestamp: Date;
  direction: 'sent' | 'received';
  message: string;
}

interface ChatActions {
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  createSession: (agentId: string, title?: string) => string;
  setCurrentSession: (sessionId: string | null) => void;
  setCurrentAgent: (agentId: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  setConnectionStatus: (status: ChatState['connectionStatus']) => void;
  clearCurrentSession: () => void;
  deleteSession: (sessionId: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  addConsoleLog: (log: ConsoleLog) => void; // NEW
}

const defaultAgents: AIAgent[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Advanced AI assistant for complex tasks',
    avatar: '🤖',
    systemPrompt: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    isActive: true,
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Thoughtful AI for analysis and writing',
    avatar: '🎭',
    systemPrompt: 'You are Claude, an AI assistant created by Anthropic. Be helpful, harmless, and honest.',
    model: 'claude-3-sonnet',
    temperature: 0.6,
    maxTokens: 2048,
    isActive: true,
  },
];

export const useChatStore = create<ChatState & ChatActions & { consoleLogs: ConsoleLog[] }>()(
  subscribeWithSelector((set, get) => ({
    sessions: [],
    currentSessionId: null,
    agents: defaultAgents,
    currentAgentId: 'gpt-4',
    isStreaming: false,
    connectionStatus: 'disconnected',
    consoleLogs: [], // NEW

    addMessage: (message) => {
      const { currentSessionId, sessions } = get();
      if (!currentSessionId) return;

      const newMessage: Message = {
        ...message,
        id: message.id,
        timestamp: new Date(),
      };

      set({
        sessions: sessions.map((session) =>
          session.id === currentSessionId
            ? {
                ...session,
                messages: [...session.messages, newMessage],
                updatedAt: new Date(),
              }
            : session
        ),
      });
    },

  updateMessage: (id, updates) => {
      const { sessions } = get();
      set({
        sessions: sessions.map((session) => ({
          ...session,
          messages: session.messages.map((message) =>
            // Only update if id matches AND message is agent-generated (role === 'assistant')
            message.id === id && message.role === 'assistant'
              ? { ...message, ...updates }
              : message
          ),
        })),
      });
    },

    createSession: (agentId, title) => {
      const sessionId = generateId();
      const newSession: ChatSession = {
        id: sessionId,
        title: title || 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        agentId,
      };

      set((state) => ({
        sessions: [newSession, ...state.sessions],
        currentSessionId: sessionId,
        currentAgentId: agentId,
      }));

      return sessionId;
    },

    setCurrentSession: (sessionId) => {
      const { sessions } = get();
      const session = sessions.find((s) => s.id === sessionId);
      
      set({
        currentSessionId: sessionId,
        currentAgentId: session?.agentId || get().currentAgentId,
      });
    },

    setCurrentAgent: (agentId) => {
      set({ currentAgentId: agentId });
    },

    setStreaming: (isStreaming) => {
      set({ isStreaming });
    },

    setConnectionStatus: (connectionStatus) => {
      set({ connectionStatus });
    },

    clearCurrentSession: () => {
      set({ currentSessionId: null });
    },

    deleteSession: (sessionId) => {
      const { sessions, currentSessionId } = get();
      const newSessions = sessions.filter((s) => s.id !== sessionId);
      
      set({
        sessions: newSessions,
        currentSessionId: currentSessionId === sessionId ? null : currentSessionId,
      });
    },

    updateSessionTitle: (sessionId, title) => {
      const { sessions } = get();
      set({
        sessions: sessions.map((session) =>
          session.id === sessionId ? { ...session, title } : session
        ),
      });
    },

    addConsoleLog: (log) => {
      set((state) => ({
        consoleLogs: [...state.consoleLogs, log],
      }));
    },
  }))
);