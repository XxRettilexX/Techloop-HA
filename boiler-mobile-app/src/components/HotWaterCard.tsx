import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
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
            <View style={styles.leftSection}>
                <Droplets
                    size={24}
                    color={isBoostActive ? COLORS.primary : COLORS.textSecondary}
                    strokeWidth={2}
                />
                <Text style={styles.title}>Hot Water Boost</Text>
            </View>
            <Switch
                value={isBoostActive}
                onValueChange={onToggleBoost}
                trackColor={{
                    false: COLORS.border,
                    true: COLORS.primary,
                }}
                thumbColor={COLORS.white}
                ios_backgroundColor={COLORS.border}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...SHADOWS.small,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    title: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
});

export default HotWaterCard;
