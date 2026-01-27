import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Send, Mic, MicOff } from 'lucide-react-native';
import { chatService, type ChatMessage } from '../services/ChatService';
import { voiceService } from '../services/VoiceService';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../theme';

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
    const [isRecording, setIsRecording] = useState(false);
    const [isTTSEnabled, setIsTTSEnabled] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        // Speak welcome message
        if (isTTSEnabled) {
            voiceService.speak(messages[0].text);
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

        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            const response = await chatService.sendMessage(text.trim());

            const botMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: response.response,
                sender: 'bot',
                timestamp: new Date(),
                validated: response.validated,
                actionTaken: response.action_taken,
            };

            setMessages((prev) => [...prev, botMessage]);

            // Speak bot response
            if (isTTSEnabled) {
                voiceService.speak(response.response);
            }

            // Scroll to bottom
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: '❌ Errore di connessione. Riprova più tardi.',
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVoiceInput = async () => {
        if (isRecording) {
            // Stop recording
            setIsRecording(false);
            const audioUri = await voiceService.stopRecording();

            if (audioUri) {
                // Convert to text (placeholder for now)
                setIsLoading(true);
                try {
                    const text = await voiceService.speechToText(audioUri);
                    await handleSendMessage(text);
                } catch (error) {
                    console.error('Voice input error:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        } else {
            // Start recording
            try {
                await voiceService.startRecording();
                setIsRecording(true);
            } catch (error) {
                console.error('Failed to start recording:', error);
                alert('Impossibile avviare la registrazione. Verifica i permessi del microfono.');
            }
        }
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isUser = item.sender === 'user';

        return (
            <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.botMessage]}>
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
                    <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
                        {item.text}
                    </Text>
                    <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.botTimestamp]}>
                        {item.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Chat Assistente</Text>
                    <Text style={styles.headerSubtitle}>Controllo caldaia in linguaggio naturale</Text>
                </View>
                <TouchableOpacity
                    style={styles.ttsButton}
                    onPress={() => {
                        setIsTTSEnabled(!isTTSEnabled);
                        voiceService.updateSettings({ ttsEnabled: !isTTSEnabled });
                    }}
                >
                    <Text style={styles.ttsButtonText}>{isTTSEnabled ? '🔊' : '🔇'}</Text>
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item.id}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Loading indicator */}
            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Elaborazione...</Text>
                </View>
            )}

            {/* Input area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
                        onPress={handleVoiceInput}
                        activeOpacity={0.7}
                    >
                        {isRecording ? (
                            <MicOff size={24} color="#FFFFFF" />
                        ) : (
                            <Mic size={24} color={COLORS.primary} />
                        )}
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
                        <Send size={20} color={inputText.trim() ? '#FFFFFF' : COLORS.textSecondary} />
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        ...SHADOWS.card,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        ...TYPOGRAPHY.h2,
        color: COLORS.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
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
        borderRadius: 16,
        ...SHADOWS.small,
    },
    userBubble: {
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: 4,
    },
    botBubble: {
        backgroundColor: COLORS.surface,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        ...TYPOGRAPHY.body,
        marginBottom: SPACING.xs,
    },
    userText: {
        color: '#FFFFFF',
    },
    botText: {
        color: COLORS.text,
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
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: SPACING.sm,
    },
    voiceButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    voiceButtonActive: {
        backgroundColor: COLORS.error,
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
        color: COLORS.text,
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
