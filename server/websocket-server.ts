import { createServer } from 'http';
import { Server } from 'socket.io';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,});

interface ChatMessage {
  id: string;
  message: string;
  sessionId: string;
  agentId: string;
}

interface AgentConfig {
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('send_message', async (data: ChatMessage) => {
    try {
      const { id, message, sessionId, agentId } = data;

      // Get agent configuration
      const agentConfig = getAgentConfig(agentId);

      const messages = [
        { role: 'system' as const, content: agentConfig.systemPrompt },
        { role: 'user' as const, content: message },
      ];

      const response = await openai.chat.completions.create({
        model: agentConfig.model,
        messages: messages,
        temperature: agentConfig.temperature,
        max_tokens: agentConfig.maxTokens,
        stream: true,
      });

      let fullContent = '';

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          
          socket.emit('streaming_response', {
            id,
            content: fullContent,
            done: false,
          });
        }
      }

      socket.emit('stream_complete', { id });

    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('stream_error', {
        id: data.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

function getAgentConfig(agentId: string): AgentConfig {
  const configs: Record<string, AgentConfig> = {
    'gpt-4': {
      systemPrompt: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses.',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 2048,
    },
    'claude': {
      systemPrompt: 'You are Claude, an AI assistant created by Anthropic. Be helpful, harmless, and honest.',
      model: 'gpt-4o', // Using GPT-4 as fallback since we're using OpenAI
      temperature: 0.6,
      maxTokens: 2048,
    },
  };

  return configs[agentId] || configs['gpt-4'];
}

const PORT = process.env.WS_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});