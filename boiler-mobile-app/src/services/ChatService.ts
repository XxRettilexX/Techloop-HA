/**
 * Chat Service - Integration with AI Chatbot API
 */
import { API_CONFIG } from '../config/api';

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    validated?: boolean;
    actionTaken?: string;
}

export interface ChatRequest {
    message: string;
    entity_id?: string;
}

export interface ChatResponse {
    response: string;
    action_taken?: string;
    validated: boolean;
    intent?: {
        action: string;
        value?: number;
        confidence: number;
    };
}

class ChatService {
    private baseUrl = API_CONFIG.chatbot;

    async sendMessage(message: string, entityId: string = 'climate.boiler'): Promise<ChatResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    entity_id: entityId,
                } as ChatRequest),
            });

            if (!response.ok) {
                throw new Error(`Chat API error: ${response.status}`);
            }

            const data: ChatResponse = await response.json();
            return data;
        } catch (error) {
            console.error('Error sending chat message:', error);
            throw error;
        }
    }

    async checkHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
            });
            return response.ok;
        } catch (error) {
            console.error('Chatbot health check failed:', error);
            return false;
        }
    }
}

export const chatService = new ChatService();
