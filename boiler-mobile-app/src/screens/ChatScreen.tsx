import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Send, Paperclip, Bot, StopCircle } from 'lucide-react-native';
import { chatService, type ChatMessage, type StreamChunk } from '../services/ChatService';
import { voiceService } from '../services/VoiceService';
import { Header, ChatBubble } from '../components';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../theme';

const quickActions = [
    { id: '1', label: 'Controlla pressione' },
    { id: '2', label: 'Ottimizza consumi' },
    { id: '3', label: 'Prenota tecnico' },
];

export const ChatScreen: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '0',
            text: 'Ciao! Sono il tuo assistente per la caldaia. Come posso aiutarti?',
            sender: 'bot',
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isTTSEnabled, setIsTTSEnabled] = useState(true);
    const flatListRef = useRef<FlatList>(null);
    const streamingMessageId = useRef<string | null>(null);

    useEffect(() => {
        if (isTTSEnabled) {
            voiceService.speak(messages[0].text);
        }
    }, []);

    // Handle streaming chunk updates
    const handleStreamChunk = useCallback((chunk: StreamChunk, fullText: string) => {
        if (chunk.type === 'content') {
            // Update the streaming message in real-time
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === streamingMessageId.current
                        ? { ...msg, text: fullText }
                        : msg
                )
            );
        } else if (chunk.type === 'done') {
            // Finalize the message
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === streamingMessageId.current
                        ? {
                            ...msg,
                            text: fullText,
                            isStreaming: false,
                            validated: chunk.validated,
                            actionTaken: chunk.action_taken,
                        }
                        : msg
                )
            );
            streamingMessageId.current = null;
        }
    }, []);

    // Cancel ongoing stream
    const handleCancelStream = useCallback(() => {
        chatService.cancelStream();
        setIsStreaming(false);
        setIsLoading(false);
        if (streamingMessageId.current) {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === streamingMessageId.current
                        ? { ...msg, isStreaming: false, text: msg.text + ' [interrotto]' }
                        : msg
                )
            );
            streamingMessageId.current = null;
        }
    }, []);

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            text: text.trim(),
            sender: 'user',
            timestamp: new Date(),
        };

        // Create placeholder for streaming bot response
        const botMessageId = (Date.now() + 1).toString();
        const botMessage: ChatMessage = {
            id: botMessageId,
            text: '',
            sender: 'bot',
            timestamp: new Date(),
            isStreaming: true,
        };

        streamingMessageId.current = botMessageId;
        setMessages((prev) => [...prev, userMessage, botMessage]);
        setInputText('');
        setIsLoading(true);
        setIsStreaming(true);

        try {
            // Use streaming API
            const response = await chatService.sendMessageStreaming(
                text.trim(),
                handleStreamChunk
            );

            // Enable TTS after streaming completes
            if (isTTSEnabled && response.response) {
                voiceService.speak(response.response);
            }

            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error: any) {
            console.error('Chat error:', error);

            let errorText = '❌ Errore di connessione. Riprova più tardi.';

            // Check for timeout or specific server busy conditions
            if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('503')) {
                errorText = 'Il server è occupato nell\'elaborazione, riprovare tra un istante';
            }

            // Update the streaming message with error
            if (streamingMessageId.current) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === streamingMessageId.current
                            ? { ...msg, text: errorText, isStreaming: false }
                            : msg
                    )
                );
                streamingMessageId.current = null;
            }
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    };

    const handleQuickAction = (action: string) => {
        handleSendMessage(action);
    };

    const MessageBubble = ({ item, index }: { item: ChatMessage; index: number }) => {
        const isUser = item.sender === 'user';
        const fadeAnim = useRef(new Animated.Value(0)).current;
        const slideAnim = useRef(new Animated.Value(20)).current;

        useEffect(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    delay: 50,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    damping: 15,
                    stiffness: 100,
                    useNativeDriver: true,
                }),
            ]).start();
        }, []);

        return (
            <Animated.View
                style={[
                    styles.messageContainer,
                    isUser ? styles.userMessage : styles.botMessage,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }
                ]}
            >
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
                    <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
                        {item.text}
                    </Text>
                    <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.botTimestamp]}>
                        {item.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <Header title="Assistant" />

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={({ item, index }) => <MessageBubble item={item} index={index} />}
                keyExtractor={(item) => item.id}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Loading indicator */}
            {isLoading && (
                <View style={styles.loadingContainer}>
                    {isStreaming ? (
                        <TouchableOpacity
                            style={styles.stopButton}
                            onPress={handleCancelStream}
                            activeOpacity={0.7}
                        >
                            <StopCircle size={20} color={COLORS.danger} />
                            <Text style={styles.stopButtonText}>Interrompi</Text>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <ActivityIndicator size="small" color={COLORS.primary} />
                            <Text style={styles.loadingText}>L'IA sta pensando...</Text>
                        </>
                    )}
                </View>
            )}

            {/* Quick Actions */}
            <View style={styles.quickActionsContainer}>
                {quickActions.map((action) => (
                    <TouchableOpacity
                        key={action.id}
                        style={styles.quickActionChip}
                        onPress={() => handleQuickAction(action.label)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.quickActionText}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Input area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachButton} activeOpacity={0.7}>
                        <Paperclip size={22} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Scrivi un messaggio..."
                        placeholderTextColor={COLORS.textSecondary}
                        multiline
                        maxLength={500}
                        editable={!isLoading}
                        onSubmitEditing={() => handleSendMessage(inputText)}
                    />

                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                        onPress={() => handleSendMessage(inputText)}
                        disabled={!inputText.trim() || isLoading}
                        activeOpacity={0.7}
                    >
                        <Send size={20} color={inputText.trim() ? COLORS.white : COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    // Header styles removed as we use shared Header component
    ttsButton: {
        padding: SPACING.sm,
    },
    ttsButtonText: {
        fontSize: 24,
    },
    messagesList: {
        flex: 1,
    },
    messagesContent: {
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    messageContainer: {
        flexDirection: 'row',
        marginVertical: SPACING.xs,
    },
    userMessage: {
        justifyContent: 'flex-end',
    },
    botMessage: {
        justifyContent: 'flex-start',
    },
    bubble: {
        maxWidth: '80%',
        padding: SPACING.md,
        borderRadius: 20,
        ...SHADOWS.small,
    },
    userBubble: {
        backgroundColor: COLORS.primary, // #6c91c2
        borderBottomRightRadius: 4,
    },
    botBubble: {
        backgroundColor: COLORS.cardBg, // #c3c9e9
        borderBottomLeftRadius: 4,
    },
    messageText: {
        ...TYPOGRAPHY.body,
        marginBottom: SPACING.xs,
    },
    userText: {
        color: COLORS.white,
    },
    botText: {
        color: COLORS.textPrimary, // #373f47
    },
    timestamp: {
        ...TYPOGRAPHY.caption,
        fontSize: 10,
    },
    userTimestamp: {
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'right',
    },
    botTimestamp: {
        color: COLORS.textSecondary,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.sm,
        gap: SPACING.sm,
    },
    loadingText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    stopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.danger,
        gap: SPACING.xs,
    },
    stopButtonText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.danger,
        fontWeight: '600',
    },
    quickActionsContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        gap: SPACING.sm,
        flexWrap: 'wrap',
    },
    quickActionChip: {
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.primary,
        ...SHADOWS.small,
    },
    quickActionText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.primary,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: SPACING.md,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        gap: SPACING.sm,
    },
    attachButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 100,
        backgroundColor: COLORS.background,
        borderRadius: 22,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        ...TYPOGRAPHY.body,
        color: COLORS.textPrimary,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.disabled,
    },
});
