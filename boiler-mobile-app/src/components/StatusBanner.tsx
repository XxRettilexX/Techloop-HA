import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../theme';

export type StatusType = 'active' | 'warning' | 'error';

interface StatusBannerProps {
    status: StatusType;
    message: string;
}

const StatusBanner: React.FC<StatusBannerProps> = ({ status, message }) => {
    const getIcon = () => {
        switch (status) {
            case 'active':
                return <CheckCircle size={20} color={COLORS.white} strokeWidth={2} />;
            case 'warning':
                return <AlertTriangle size={20} color={COLORS.white} strokeWidth={2} />;
            case 'error':
                return <XCircle size={20} color={COLORS.white} strokeWidth={2} />;
        }
    };

    const getBackgroundColor = () => {
        switch (status) {
            case 'active':
                return COLORS.success; // #10B981 green
            case 'warning':
                return COLORS.warning;
            case 'error':
                return COLORS.danger;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
            {getIcon()}
            <Text style={styles.message}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: 20,
        gap: SPACING.sm,
        ...SHADOWS.small,
    },
    message: {
        ...TYPOGRAPHY.body,
        color: COLORS.white,
        fontWeight: '600',
        flex: 1,
    },
});

export default StatusBanner;
