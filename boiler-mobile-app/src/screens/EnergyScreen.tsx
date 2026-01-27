import React from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Menu, User, Lightbulb, TrendingDown } from 'lucide-react-native';
import { EnergyBarChart } from '../components';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../theme';
import { useEnergyData } from '../contexts/DataContext';

export const EnergyScreen: React.FC = () => {
    const { energyData } = useEnergyData();

    // Calculate savings percentage
    const savingsPercent = energyData.previousMonth > 0
        ? ((energyData.previousMonth - energyData.currentMonth) / energyData.previousMonth * 100).toFixed(0)
        : '0';

    const isPositiveSavings = Number(savingsPercent) > 0;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
                    <Menu size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Energy</Text>
                <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
                    <User size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Energy Chart */}
                <EnergyBarChart
                    currentMonth={energyData.currentMonth}
                    previousMonth={energyData.previousMonth}
                />

                {/* Info Box */}
                <View style={styles.infoBox}>
                    <TrendingDown size={24} color={COLORS.success} />
                    <Text style={styles.infoText}>
                        {isPositiveSavings
                            ? `Stai consumando il ${savingsPercent}% in meno rispetto al mese scorso`
                            : 'Monitora i tuoi consumi per ottimizzare il risparmio'
                        }
                    </Text>
                </View>

                {/* Tip Section */}
                <View style={styles.tipCard}>
                    <View style={styles.tipIconContainer}>
                        <Lightbulb size={24} color={COLORS.warning} />
                    </View>
                    <View style={styles.tipContent}>
                        <Text style={styles.tipTitle}>Suggerimento</Text>
                        <Text style={styles.tipText}>
                            Abbassare di 1° ti farà risparmiare 5€/mese
                        </Text>
                    </View>
                </View>

                {/* Stats Overview */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: isPositiveSavings ? COLORS.success : COLORS.textSecondary }]}>
                            {isPositiveSavings ? '-' : ''}{savingsPercent}%
                        </Text>
                        <Text style={styles.statLabel}>vs Mese Scorso</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{energyData.currentMonth}</Text>
                        <Text style={styles.statLabel}>kWh Questo Mese</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    headerTitle: {
        ...TYPOGRAPHY.h2,
        color: COLORS.textPrimary,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: SPACING.md,
        gap: SPACING.md,
    },
    infoBox: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        padding: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        ...SHADOWS.small,
    },
    infoText: {
        ...TYPOGRAPHY.body,
        color: COLORS.textPrimary,
        fontWeight: '600',
        flex: 1,
    },
    tipCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        ...SHADOWS.small,
    },
    tipIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF4E6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tipContent: {
        flex: 1,
    },
    tipTitle: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tipText: {
        ...TYPOGRAPHY.body,
        color: COLORS.textPrimary,
        marginTop: SPACING.xs,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: SPACING.lg,
        alignItems: 'center',
        ...SHADOWS.small,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: SPACING.xs,
    },
    statLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
});
