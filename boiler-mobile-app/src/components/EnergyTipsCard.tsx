import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS } from '../theme';

interface EnergyTipsCardProps {
    tips: string[];
}

const EnergyTipsCard: React.FC<EnergyTipsCardProps> = ({ tips }) => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Lightbulb size={24} color={COLORS.primary} strokeWidth={2} />
                <Text style={styles.title}>Energy Saving Tips</Text>
            </View>

            <View style={styles.tipsContainer}>
                {tips.map((tip, index) => (
                    <View key={index} style={styles.tipRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.tipText}>{tip}</Text>
                    </View>
                ))}
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
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    title: {
        ...TYPOGRAPHY.title,
        fontSize: 18,
    },
    tipsContainer: {
        gap: SPACING.sm,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        marginTop: 7,
    },
    tipText: {
        ...TYPOGRAPHY.body,
        color: COLORS.textPrimary,
        flex: 1,
    },
});

export default EnergyTipsCard;
