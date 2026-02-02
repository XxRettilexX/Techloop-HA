import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Flame, Droplets, Gauge, Activity, Thermometer, Wind, Sun, Clock, AlertTriangle } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS } from '../theme';

interface BoilerStatusCardProps {
    waterTemp: number;
    pressure: number;
    modulation: number;
    flameOn: boolean;
    // New physics metrics
    humidity?: number;
    perceivedTemp?: number;
    efficiency?: number;
    runtimeHours?: number;
    solarGain?: number;
    errorCode?: string | null;
}

const BoilerStatusCard: React.FC<BoilerStatusCardProps> = ({
    waterTemp,
    pressure,
    modulation,
    flameOn,
    humidity,
    perceivedTemp,
    efficiency,
    runtimeHours,
    solarGain,
    errorCode,
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
            {/* Error Banner */}
            {errorCode && (
                <View style={styles.errorBanner}>
                    <AlertTriangle size={18} color={COLORS.white} />
                    <Text style={styles.errorText}>
                        Errore: {errorCode}
                    </Text>
                </View>
            )}

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

                {/* Humidity - New */}
                {humidity !== undefined && (
                    <View style={styles.metric}>
                        <Wind size={24} color={COLORS.info} strokeWidth={2} />
                        <Text style={styles.metricLabel}>Humidity</Text>
                        <Text style={styles.metricValue}>{humidity.toFixed(0)}%</Text>
                    </View>
                )}

                {/* Perceived Temperature - New */}
                {perceivedTemp !== undefined && (
                    <View style={styles.metric}>
                        <Thermometer size={24} color={COLORS.primary} strokeWidth={2} />
                        <Text style={styles.metricLabel}>Perceived</Text>
                        <Text style={styles.metricValue}>{perceivedTemp.toFixed(1)}°C</Text>
                    </View>
                )}

                {/* Efficiency - New */}
                {efficiency !== undefined && (
                    <View style={styles.metric}>
                        <Activity size={24} color={COLORS.success} strokeWidth={2} />
                        <Text style={styles.metricLabel}>Efficiency</Text>
                        <Text style={[styles.metricValue, styles.efficiencyValue]}>
                            {efficiency.toFixed(0)}%
                        </Text>
                    </View>
                )}

                {/* Runtime Hours - New */}
                {runtimeHours !== undefined && (
                    <View style={styles.metric}>
                        <Clock size={24} color={COLORS.textSecondary} strokeWidth={2} />
                        <Text style={styles.metricLabel}>Runtime</Text>
                        <Text style={styles.metricValue}>{runtimeHours.toFixed(1)}h</Text>
                    </View>
                )}

                {/* Solar Gain - New */}
                {solarGain !== undefined && solarGain > 0 && (
                    <View style={styles.metric}>
                        <Sun size={24} color={COLORS.warning} strokeWidth={2} />
                        <Text style={styles.metricLabel}>Solar Gain</Text>
                        <Text style={[styles.metricValue, styles.solarValue]}>
                            +{solarGain.toFixed(1)}°C
                        </Text>
                    </View>
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
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.danger,
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.small,
        marginBottom: SPACING.md,
        gap: SPACING.sm,
    },
    errorText: {
        ...TYPOGRAPHY.body,
        color: COLORS.white,
        fontWeight: '600',
        flex: 1,
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
    efficiencyValue: {
        color: COLORS.success,
    },
    solarValue: {
        color: COLORS.warning,
    },
});

export default BoilerStatusCard;
