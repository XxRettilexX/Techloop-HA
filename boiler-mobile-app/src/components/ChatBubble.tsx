import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../theme';

export type MessageSender = 'user' | 'bot';

interface ChatBubbleProps {
    message: string;
    sender: MessageSender;
    timestamp: Date;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
    message,
    sender,
    timestamp,
}) => {
    const isUser = sender === 'user';

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <View style={[styles.container, isUser && styles.containerUser]}>
            <View
                style={[
                    styles.bubble,
                    isUser ? styles.bubbleUser : styles.bubbleBot,
                ]}
            >
                <Text style={[styles.message, isUser && styles.messageUser]}>
                    {message}
                </Text>
                <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
                    {formatTime(timestamp)}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginVertical: SPACING.xs,
        paddingHorizontal: SPACING.md,
    },
    containerUser: {
        justifyContent: 'flex-end',
    },
    bubble: {
        maxWidth: '75%',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    bubbleBot: {
        backgroundColor: COLORS.cardBg,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 20,
        borderBottomRightRadius: 24,
        borderBottomLeftRadius: 4,
    },
    bubbleUser: {
        backgroundColor: COLORS.primary,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 24,
        borderBottomRightRadius: 4,
        borderBottomLeftRadius: 24,
    },
    message: {
        ...TYPOGRAPHY.body,
        color: COLORS.textPrimary,
    },
    messageUser: {
        color: COLORS.white,
    },
    timestamp: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
        fontSize: 10,
    },
    timestampUser: {
        color: COLORS.white,
        opacity: 0.8,
    },
});

export default ChatBubble;
