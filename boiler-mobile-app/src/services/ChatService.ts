/**
 * Chat Service - Integration with AI Chatbot API
 * Connects via mobile_api or directly to chatbot service
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
    // Use mobile_api chat endpoint (proxies to chatbot service)
    private mobileApiUrl = API_CONFIG.mobileApi;
    // Direct chatbot access (fallback)
    private chatbotUrl = API_CONFIG.chatbot;

    /**
     * Send message via mobile_api (recommended - handles auth)
     */
    async sendMessage(message: string, entityId: string = 'climate.boiler'): Promise<ChatResponse> {
        try {
            // Try mobile_api first (unified endpoint with auth)
            const response = await fetch(`${this.mobileApiUrl}/chat`, {
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
            console.error('Error sending chat message via mobile_api:', error);

            // Fallback to direct chatbot access
            return this.sendMessageDirect(message, entityId);
        }
    }

    /**
     * Send message directly to chatbot service (fallback)
     */
    async sendMessageDirect(message: string, entityId: string = 'climate.boiler'): Promise<ChatResponse> {
        try {
            const response = await fetch(`${this.chatbotUrl}/chat`, {
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
                throw new Error(`Chatbot API error: ${response.status}`);
            }

            const data: ChatResponse = await response.json();
            return data;
        } catch (error) {
            console.error('Error sending chat message directly:', error);
            throw error;
        }
    }

    /**
     * Check chatbot health (via mobile_api)
     */
    async checkHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${this.mobileApiUrl.replace('/api', '')}/health`, {
                method: 'GET',
            });
            return response.ok;
        } catch (error) {
            console.error('Chatbot health check failed:', error);
            return false;
        }
    }

    /**
     * Check direct chatbot health
     */
    async checkChatbotHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${this.chatbotUrl}/health`, {
                method: 'GET',
            });
            return response.ok;
        } catch (error) {
            console.error('Direct chatbot health check failed:', error);
            return false;
        }
    }
}

export const chatService = new ChatService();
