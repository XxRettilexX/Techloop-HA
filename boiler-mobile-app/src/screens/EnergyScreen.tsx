import React from 'react';
import { StyleSheet, ScrollView, View, SafeAreaView, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { EnergyBarChart, EnergyTipsCard } from '../components';
import { COLORS, SPACING, TYPOGRAPHY } from '../theme';
import { Zap } from 'lucide-react-native';

export const EnergyScreen: React.FC = () => {
    const energyTips = [
        'Lower the temperature by 1°C to save up to 10% energy',
        'Your boiler is most efficient between 60-70°C water temperature',
        'Consider scheduling lower temps when windows are open',
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Zap size={28} color={COLORS.accent} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>Energy Monitor</Text>
                        <Text style={styles.subtitle}>Track your consumption and savings</Text>
                    </View>
                </View>

                {/* Energy Chart */}
                <EnergyBarChart currentMonth={145} previousMonth={168} />

                {/* Energy Tips */}
                <EnergyTipsCard tips={energyTips} />

                {/* Stats Overview */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>-13.7%</Text>
                        <Text style={styles.statLabel}>vs Last Month</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>€23</Text>
                        <Text style={styles.statLabel}>Saved</Text>
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
    scrollView: {
        flex: 1,
    },
    content: {
        padding: SPACING.md,
        gap: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    headerIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
    },
    title: {
        ...TYPOGRAPHY.h2,
        color: COLORS.text,
        marginBottom: 4,
    },
    subtitle: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: SPACING.lg,
        alignItems: 'center',
    },
    statValue: {
        ...TYPOGRAPHY.h2,
        color: COLORS.success,
        marginBottom: SPACING.xs,
    },
    statLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
});
