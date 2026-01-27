import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../theme';

const { width } = Dimensions.get('window');
const BAR_WIDTH = (width - SPACING.md * 4 - SPACING.lg) / 2;

interface EnergyBarChartProps {
    currentMonth: number;
    previousMonth: number;
}

const EnergyBarChart: React.FC<EnergyBarChartProps> = ({
    currentMonth,
    previousMonth,
}) => {
    const maxValue = Math.max(currentMonth, previousMonth);
    const currentHeight = maxValue > 0 ? (currentMonth / maxValue) * 150 : 0;
    const previousHeight = maxValue > 0 ? (previousMonth / maxValue) * 150 : 0;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Consumption Comparison</Text>

            <View style={styles.chartContainer}>
                {/* This Month Bar */}
                <View style={styles.barWrapper}>
                    <View style={styles.barContainer}>
                        <View
                            style={[
                                styles.bar,
                                styles.currentBar,
                                { height: currentHeight }
                            ]}
                        />
                    </View>
                    <Text style={styles.barLabel}>This Month</Text>
                    <Text style={styles.barValue}>{currentMonth} kWh</Text>
                </View>

                {/* Last Month Bar */}
                <View style={styles.barWrapper}>
                    <View style={styles.barContainer}>
                        <View
                            style={[
                                styles.bar,
                                styles.previousBar,
                                { height: previousHeight }
                            ]}
                        />
                    </View>
                    <Text style={styles.barLabel}>Last Month</Text>
                    <Text style={styles.barValue}>{previousMonth} kWh</Text>
                </View>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                    <Text style={styles.legendText}>This Month</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#8b8982' }]} />
                    <Text style={styles.legendText}>Last Month</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: SPACING.lg,
        ...SHADOWS.medium,
    },
    title: {
        ...TYPOGRAPHY.subtitle,
        color: COLORS.textPrimary,
        fontWeight: '600',
        marginBottom: SPACING.lg,
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 200,
        paddingBottom: SPACING.md,
    },
    barWrapper: {
        alignItems: 'center',
        flex: 1,
    },
    barContainer: {
        height: 150,
        justifyContent: 'flex-end',
        width: 60,
    },
    bar: {
        width: '100%',
        borderRadius: 12,
        minHeight: 20,
    },
    currentBar: {
        backgroundColor: COLORS.primary, // #6c91c2
    },
    previousBar: {
        backgroundColor: '#8b8982', // Taupe/Oliva
    },
    barLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginTop: SPACING.sm,
    },
    barValue: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginTop: SPACING.xs,
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.lg,
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
});

export default EnergyBarChart;
