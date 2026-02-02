/**
 * Chat Service - Integration with AI Chatbot API
 * Enhanced with SSE streaming support for real-time token-by-token responses
 * With cached fallback responses when API unavailable
 */
import { API_CONFIG } from '../config/api';

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    validated?: boolean;
    actionTaken?: string;
    isOffline?: boolean;
    isStreaming?: boolean;
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
    isOffline?: boolean;
    messageId?: string;
}

// SSE Stream chunk types
export interface StreamChunk {
    type: 'content' | 'done' | 'error';
    content?: string;
    message_id?: string;
    action_taken?: string;
    validated?: boolean;
    error?: string;
}

// Callback type for streaming updates
export type StreamCallback = (chunk: StreamChunk, fullText: string) => void;

// Cached responses for common queries
const CACHED_RESPONSES: Record<string, ChatResponse> = {
    'temperatura': {
        response: 'La temperatura attuale della caldaia è di circa 45°C. Se vuoi modificarla, usa il quadrante nella Dashboard.',
        validated: false,
        isOffline: true,
    },
    'pressione': {
        response: 'La pressione della caldaia è intorno a 1.5 bar, che è nel range ottimale (1-2 bar). Non è necessario alcun intervento.',
        validated: false,
        isOffline: true,
    },
    'controlla pressione': {
        response: 'La pressione della caldaia è intorno a 1.5 bar - tutto nella norma! Il range ideale è tra 1 e 2 bar.',
        validated: false,
        isOffline: true,
    },
    'ottimizza consumi': {
        response: 'Per ottimizzare i consumi ti consiglio di: 1) Programmare orari di accensione 2) Abbassare la temperatura di notte 3) Verificare l\'isolamento delle finestre.',
        validated: false,
        isOffline: true,
    },
    'prenota tecnico': {
        response: 'Per prenotare un tecnico, contatta il servizio assistenza al numero 800-123-456. I nostri tecnici sono disponibili dal lunedì al venerdì, 8:00-18:00.',
        validated: false,
        isOffline: true,
    },
    'stato': {
        response: 'La caldaia è operativa e funziona correttamente. Temperatura acqua: ~45°C, Pressione: ~1.5 bar.',
        validated: false,
        isOffline: true,
    },
    'aiuto': {
        response: 'Posso aiutarti con: controllare la temperatura, verificare la pressione, ottimizzare i consumi, prenotare un tecnico. Cosa ti serve?',
        validated: false,
        isOffline: true,
    },
    'ciao': {
        response: 'Ciao! Sono il tuo assistente virtuale per la caldaia. Come posso aiutarti oggi?',
        validated: false,
        isOffline: true,
    },
};

// Default fallback response
const DEFAULT_FALLBACK: ChatResponse = {
    response: 'Al momento non riesco a connettermi al server. Prova a chiedere: "controlla pressione", "stato", o "ottimizza consumi".',
    validated: false,
    isOffline: true,
};

class ChatService {
    private mobileApiUrl = API_CONFIG.mobileApi;
    private chatbotUrl = API_CONFIG.chatbot;
    private responseCache = new Map<string, ChatResponse>();
    private abortController: AbortController | null = null;

    /**
     * Find cached response based on message keywords
     */
    private findCachedResponse(message: string): ChatResponse | null {
        const lowerMessage = message.toLowerCase().trim();

        // Direct match
        if (CACHED_RESPONSES[lowerMessage]) {
            return CACHED_RESPONSES[lowerMessage];
        }

        // Keyword matching
        for (const [key, response] of Object.entries(CACHED_RESPONSES)) {
            if (lowerMessage.includes(key) || key.includes(lowerMessage)) {
                return response;
            }
        }

        // Check recent cache
        if (this.responseCache.has(lowerMessage)) {
            return this.responseCache.get(lowerMessage)!;
        }

        return null;
    }

    /**
     * Send message with SSE streaming support
     * Receives token-by-token updates in real-time
     */
    async sendMessageStreaming(
        message: string,
        onChunk: StreamCallback,
        entityId: string = 'climate.boiler'
    ): Promise<ChatResponse> {
        return new Promise((resolve, reject) => {
            let fullText = '';
            let messageId = '';
            let actionTaken: string | undefined;
            let validated = false;

            const url = `${this.mobileApiUrl}/chat/stream?message=${encodeURIComponent(message)}&entity_id=${encodeURIComponent(entityId)}`;

            // @ts-ignore - EventSource is provided by react-native-sse polyfill
            const es = new EventSource(url);

            es.onmessage = (event: any) => {
                if (event.data === '[DONE]') {
                    es.close();
                    const finalResponse = {
                        response: fullText,
                        action_taken: actionTaken,
                        validated,
                        messageId,
                    };
                    this.responseCache.set(message.toLowerCase().trim(), finalResponse);
                    resolve(finalResponse);
                    return;
                }

                try {
                    const chunk: StreamChunk = JSON.parse(event.data);

                    if (chunk.type === 'content' && chunk.content) {
                        fullText += chunk.content;
                        onChunk(chunk, fullText);
                    } else if (chunk.type === 'done') {
                        messageId = chunk.message_id || '';
                        actionTaken = chunk.action_taken;
                        validated = chunk.validated || false;
                        onChunk(chunk, fullText);
                    } else if (chunk.type === 'error') {
                        es.close();
                        reject(new Error(chunk.error || 'Stream error'));
                    }
                } catch (parseError) {
                    console.warn('Failed to parse SSE chunk:', event.data);
                }
            };

            es.onerror = (error: any) => {
                es.close();
                console.log('Streaming failed, falling back to standard API', error);
                // Fallback to standard non-streaming API
                this.sendMessage(message, entityId)
                    .then(resolve)
                    .catch(reject);
            };
        });
    }
} catch (error: any) {
    if (error.name === 'AbortError') {
        throw error;
    }

    console.log('Streaming failed, falling back to standard API:', error.message);

    // Fallback to standard API
    return this.sendMessage(message, entityId);
}
    }

/**
 * Cancel ongoing stream
 */
cancelStream() {
    if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
    }
}

    /**
     * Send message with intelligent fallback
     */
    async sendMessage(message: string, entityId: string = 'climate.boiler'): Promise < ChatResponse > {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(`${this.mobileApiUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, entity_id: entityId }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

            if(!response.ok) {
    throw new Error(`API error: ${response.status}`);
}

const data: ChatResponse = await response.json();

// Cache successful response
this.responseCache.set(message.toLowerCase().trim(), data);

return data;
        } catch (error: any) {
    console.log('Chat API unavailable or timed out', error.name);

    // Propagate AbortError (timeout) so UI can handle it specifically
    if (error.name === 'AbortError') {
        throw error;
    }

    console.log('Using fallback response');

    // Try cached response
    const cached = this.findCachedResponse(message);
    if (cached) {
        return cached;
    }

    // Try direct chatbot
    try {
        return await this.sendMessageDirect(message, entityId);
    } catch (directError: any) {
        if (directError.name === 'AbortError') {
            throw directError;
        }
        return DEFAULT_FALLBACK;
    }
}
    }

    /**
     * Direct chatbot access (fallback)
     */
    async sendMessageDirect(message: string, entityId: string = 'climate.boiler'): Promise < ChatResponse > {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
        const response = await fetch(`${this.chatbotUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, entity_id: entityId }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

            if(!response.ok) {
    throw new Error(`Chatbot error: ${response.status}`);
}

return await response.json();
        } catch (error) {
    clearTimeout(timeoutId);
    throw error;
}
    }

    /**
     * Health check
     */
    async checkHealth(): Promise < boolean > {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${this.mobileApiUrl.replace('/api', '')}/health`, {
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
            return response.ok;
    } catch {
        return false;
    }
}
}

export const chatService = new ChatService();
