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
    ActivityIndicator,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Send, Paperclip, Bot } from 'lucide-react-native';
import { chatService, type ChatMessage } from '../services/ChatService';
import { voiceService } from '../services/VoiceService';
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
    const [isTTSEnabled, setIsTTSEnabled] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
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

            if (isTTSEnabled) {
                voiceService.speak(response.response);
            }

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
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.botIconContainer}>
                        <Bot size={24} color={COLORS.white} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>AI Support</Text>
                        <View style={styles.onlineStatus}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.onlineText}>Online</Text>
                        </View>
                    </View>
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
                renderItem={({ item, index }) => <MessageBubble item={item} index={index} />}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        backgroundColor: COLORS.white,
        ...SHADOWS.small,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    botIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        ...TYPOGRAPHY.subtitle,
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    onlineStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.success,
    },
    onlineText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.success,
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
