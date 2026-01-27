import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Home, Plane, Leaf } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS } from '../theme';

export type ModeType = 'away' | 'vacation' | 'eco';

interface QuickModeCardProps {
    mode: ModeType;
    label: string;
    isActive: boolean;
    onPress: () => void;
}

const getModeIcon = (mode: ModeType) => {
    switch (mode) {
        case 'away':
            return Home;
        case 'vacation':
            return Plane;
        case 'eco':
            return Leaf;
    }
};

const QuickModeCard: React.FC<QuickModeCardProps> = ({
    mode,
    label,
    isActive,
    onPress,
}) => {
    const Icon = getModeIcon(mode);

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isActive && styles.containerActive,
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Icon
                size={32}
                color={isActive ? COLORS.white : COLORS.primary}
                strokeWidth={2}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
                {label}
            </Text>
            {isActive && <View style={styles.activeBadge} />}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.cardBg,
        borderRadius: BORDER_RADIUS.standard,
        padding: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120,
        minHeight: 120,
        ...SHADOWS.small,
    },
    containerActive: {
        backgroundColor: COLORS.primary,
        ...SHADOWS.large,
    },
    label: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginTop: SPACING.sm,
        textAlign: 'center',
    },
    labelActive: {
        color: COLORS.white,
    },
    activeBadge: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.white,
    },
});

export default QuickModeCard;
