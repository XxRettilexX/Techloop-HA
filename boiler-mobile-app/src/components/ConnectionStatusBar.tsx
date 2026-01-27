/**
 * ConnectionStatusBar - Visual indicator for connection status
 * Shows connected, connecting, offline, or error state
 */
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react-native';
import { useConnectionStatus } from '../contexts/DataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../theme';

export const ConnectionStatusBar: React.FC = () => {
    const { connectionStatus, lastUpdated, errorMessage, retryConnection } = useConnectionStatus();
    const [isRetrying, setIsRetrying] = React.useState(false);
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        if (connectionStatus === 'connecting') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.5, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [connectionStatus]);

    const handleRetry = async () => {
        setIsRetrying(true);
        await retryConnection();
        setIsRetrying(false);
    };

    const getStatusConfig = () => {
        switch (connectionStatus) {
            case 'connected':
                return {
                    bgColor: COLORS.success,
                    icon: <CheckCircle size={16} color={COLORS.white} />,
                    text: 'Connesso',
                    showRetry: false,
                };
            case 'connecting':
                return {
                    bgColor: COLORS.warning,
                    icon: <RefreshCw size={16} color={COLORS.white} />,
                    text: 'Connessione in corso...',
                    showRetry: false,
                };
            case 'offline':
                return {
                    bgColor: '#EF476F',
                    icon: <WifiOff size={16} color={COLORS.white} />,
                    text: 'Offline',
                    showRetry: true,
                };
            case 'error':
                return {
                    bgColor: COLORS.warning,
                    icon: <AlertCircle size={16} color={COLORS.white} />,
                    text: 'Connessione instabile',
                    showRetry: true,
                };
            default:
                return {
                    bgColor: COLORS.textSecondary,
                    icon: <Wifi size={16} color={COLORS.white} />,
                    text: 'Sconosciuto',
                    showRetry: true,
                };
        }
    };

    const config = getStatusConfig();

    // Only show when not connected or recently connected (within 3s)
    const [showBanner, setShowBanner] = React.useState(true);

    React.useEffect(() => {
        if (connectionStatus === 'connected') {
            const timer = setTimeout(() => setShowBanner(false), 3000);
            return () => clearTimeout(timer);
        } else {
            setShowBanner(true);
        }
    }, [connectionStatus]);

    if (!showBanner && connectionStatus === 'connected') {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                { backgroundColor: config.bgColor, opacity: pulseAnim }
            ]}
        >
            <View style={styles.content}>
                {config.icon}
                <Text style={styles.text}>{config.text}</Text>

                {lastUpdated && connectionStatus === 'connected' && (
                    <Text style={styles.timestamp}>
                        {lastUpdated.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                )}
            </View>

            {config.showRetry && (
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleRetry}
                    disabled={isRetrying}
                >
                    <RefreshCw
                        size={16}
                        color={COLORS.white}
                        style={isRetrying ? styles.spinning : undefined}
                    />
                    <Text style={styles.retryText}>Riprova</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.md,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    text: {
        ...TYPOGRAPHY.caption,
        color: COLORS.white,
        fontWeight: '600',
    },
    timestamp: {
        ...TYPOGRAPHY.caption,
        color: 'rgba(255,255,255,0.7)',
        marginLeft: SPACING.sm,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 4,
        paddingHorizontal: SPACING.sm,
        borderRadius: 12,
    },
    retryText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.white,
        fontWeight: '600',
    },
    spinning: {
        // Animation would be handled by Animated API
    },
});
