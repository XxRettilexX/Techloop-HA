import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Flame, Droplets, Gauge, Activity } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS } from '../theme';

interface BoilerStatusCardProps {
    waterTemp: number;
    pressure: number;
    modulation: number;
    flameOn: boolean;
}

const BoilerStatusCard: React.FC<BoilerStatusCardProps> = ({
    waterTemp,
    pressure,
    modulation,
    flameOn,
}) => {
    // Animated value for flame
    const flameOpacity = React.useRef(new Animated.Value(flameOn ? 1 : 0)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(flameOpacity, {
                    toValue: flameOn ? 0.6 : 0,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(flameOpacity, {
                    toValue: flameOn ? 1 : 0,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [flameOn]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Boiler Status</Text>

            <View style={styles.grid}>
                {/* Water Temperature */}
                <View style={styles.metric}>
                    <Droplets size={24} color={COLORS.primary} strokeWidth={2} />
                    <Text style={styles.metricLabel}>Water Temp</Text>
                    <Text style={styles.metricValue}>{waterTemp.toFixed(1)}°C</Text>
                </View>

                {/* Pressure */}
                <View style={styles.metric}>
                    <Gauge size={24} color={COLORS.textSecondary} strokeWidth={2} />
                    <Text style={styles.metricLabel}>Pressure</Text>
                    <Text style={styles.metricValue}>{pressure.toFixed(1)} bar</Text>
                </View>

                {/* Modulation */}
                <View style={styles.metric}>
                    <Activity size={24} color={COLORS.textSecondary} strokeWidth={2} />
                    <Text style={styles.metricLabel}>Modulation</Text>
                    <Text style={styles.metricValue}>{modulation}%</Text>
                </View>

                {/* Flame Status */}
                <View style={styles.metric}>
                    <Animated.View style={{ opacity: flameOpacity }}>
                        <Flame
                            size={24}
                            color={flameOn ? COLORS.warning : COLORS.textSecondary}
                            strokeWidth={2}
                            fill={flameOn ? COLORS.warning : 'none'}
                        />
                    </Animated.View>
                    <Text style={styles.metricLabel}>Flame</Text>
                    <Text style={[styles.metricValue, flameOn && styles.flameActive]}>
                        {flameOn ? 'ON' : 'OFF'}
                    </Text>
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
    title: {
        ...TYPOGRAPHY.title,
        fontSize: 18,
        marginBottom: SPACING.md,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    metric: {
        flex: 1,
        minWidth: '45%',
        alignItems: 'center',
        padding: SPACING.sm,
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.small,
    },
    metricLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    metricValue: {
        ...TYPOGRAPHY.body,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: SPACING.xs,
    },
    flameActive: {
        color: COLORS.warning,
    },
});

export default BoilerStatusCard;
