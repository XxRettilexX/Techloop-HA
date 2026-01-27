import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Droplets } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS } from '../theme';

interface HotWaterCardProps {
    isBoostActive: boolean;
    onToggleBoost: () => void;
    temperature?: number;
}

const HotWaterCard: React.FC<HotWaterCardProps> = ({
    isBoostActive,
    onToggleBoost,
    temperature = 55,
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Droplets
                        size={24}
                        color={isBoostActive ? COLORS.primary : COLORS.textSecondary}
                        strokeWidth={2}
                    />
                    <Text style={styles.title}>Hot Water</Text>
                </View>
                <Switch
                    value={isBoostActive}
                    onValueChange={onToggleBoost}
                    trackColor={{
                        false: COLORS.textSecondary,
                        true: COLORS.primary,
                    }}
                    thumbColor={COLORS.white}
                />
            </View>

            <View style={styles.content}>
                <Text style={styles.label}>Boost Mode</Text>
                <Text style={styles.status}>
                    {isBoostActive ? 'Active' : 'Inactive'}
                </Text>
                {isBoostActive && (
                    <Text style={styles.tempText}>{temperature}°C</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.cardBg,
        borderRadius: BORDER_RADIUS.standard,
        padding: SPACING.md,
        ...SHADOWS.medium,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    title: {
        ...TYPOGRAPHY.title,
        fontSize: 18,
    },
    content: {
        marginTop: SPACING.xs,
    },
    label: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    status: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    tempText: {
        ...TYPOGRAPHY.title,
        color: COLORS.primary,
        marginTop: SPACING.xs,
    },
});

export default HotWaterCard;
