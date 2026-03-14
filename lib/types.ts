 // Code generated via "Slingshot" 
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isStreaming?: boolean;
  agentId?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  agentId: string;
}

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
}

export interface StreamingResponse {
  id: string;
  content: string;
  done: boolean;
  error?: string;
}

export interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  agents: AIAgent[];
  currentAgentId: string;
  isStreaming: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}