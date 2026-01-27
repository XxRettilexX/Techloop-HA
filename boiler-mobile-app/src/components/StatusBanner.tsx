import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../theme';

export type StatusType = 'active' | 'warning' | 'error';

interface StatusBannerProps {
    status: StatusType;
    message: string;
}

const StatusBanner: React.FC<StatusBannerProps> = ({ status, message }) => {
    const getIcon = () => {
        switch (status) {
            case 'active':
                return <CheckCircle size={20} color={COLORS.primary} strokeWidth={2} />;
            case 'warning':
                return <AlertTriangle size={20} color={COLORS.warning} strokeWidth={2} />;
            case 'error':
                return <XCircle size={20} color={COLORS.danger} strokeWidth={2} />;
        }
    };

    const getBackgroundColor = () => {
        switch (status) {
            case 'active':
                return COLORS.cardBg;
            case 'warning':
                return '#FFF4E6'; // Light orange
            case 'error':
                return '#FFE6E6'; // Light red
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
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.standard,
        gap: SPACING.sm,
    },
    message: {
        ...TYPOGRAPHY.body,
        color: COLORS.textPrimary,
        flex: 1,
    },
});

export default StatusBanner;
