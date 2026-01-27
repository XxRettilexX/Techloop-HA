import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS } from '../theme';

interface EnergyBarChartProps {
    currentMonth: number; // kWh
    previousMonth: number; // kWh
    currentLabel?: string;
    previousLabel?: string;
}

const EnergyBarChart: React.FC<EnergyBarChartProps> = ({
    currentMonth,
    previousMonth,
    currentLabel = 'This Month',
    previousLabel = 'Last Month',
}) => {
    const maxValue = Math.max(currentMonth, previousMonth);
    const chartHeight = 200;
    const barWidth = 60;
    const gap = 40;

    // Calculate bar heights proportionally
    const currentHeight = (currentMonth / maxValue) * (chartHeight - 40);
    const previousHeight = (previousMonth / maxValue) * (chartHeight - 40);

    const difference = currentMonth - previousMonth;
    const percentChange = previousMonth > 0
        ? ((difference / previousMonth) * 100).toFixed(1)
        : '0';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Energy Consumption</Text>
                <View style={styles.changeContainer}>
                    <Text
                        style={[
                            styles.changeText,
                            difference > 0 ? styles.changeNegative : styles.changePositive,
                        ]}
                    >
                        {difference > 0 ? '+' : ''}{percentChange}%
                    </Text>
                </View>
            </View>

            <View style={styles.chartContainer}>
                <Svg width={barWidth * 2 + gap + 40} height={chartHeight}>
                    {/* Previous Month Bar */}
                    <Rect
                        x={20}
                        y={chartHeight - previousHeight - 20}
                        width={barWidth}
                        height={previousHeight}
                        fill={COLORS.textSecondary}
                        rx={8}
                    />
                    <SvgText
                        x={20 + barWidth / 2}
                        y={chartHeight - 5}
                        fontSize="12"
                        fill={COLORS.textSecondary}
                        textAnchor="middle"
                    >
                        {previousLabel}
                    </SvgText>

                    {/* Current Month Bar */}
                    <Rect
                        x={20 + barWidth + gap}
                        y={chartHeight - currentHeight - 20}
                        width={barWidth}
                        height={currentHeight}
                        fill={COLORS.primary}
                        rx={8}
                    />
                    <SvgText
                        x={20 + barWidth + gap + barWidth / 2}
                        y={chartHeight - 5}
                        fontSize="12"
                        fill={COLORS.primary}
                        textAnchor="middle"
                    >
                        {currentLabel}
                    </SvgText>
                </Svg>
            </View>

            <View style={styles.footer}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.textSecondary }]} />
                    <Text style={styles.legendText}>{previousMonth} kWh</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                    <Text style={styles.legendText}>{currentMonth} kWh</Text>
                </View>
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
        marginBottom: SPACING.md,
    },
    title: {
        ...TYPOGRAPHY.title,
        fontSize: 18,
    },
    changeContainer: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.small,
        backgroundColor: COLORS.white,
    },
    changeText: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
    },
    changePositive: {
        color: COLORS.success,
    },
    changeNegative: {
        color: COLORS.danger,
    },
    chartContainer: {
        alignItems: 'center',
        marginVertical: SPACING.md,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: SPACING.sm,
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
        ...TYPOGRAPHY.body,
        color: COLORS.textPrimary,
    },
});

export default EnergyBarChart;
