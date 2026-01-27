import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Animated,
} from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS } from '../theme';

const { width } = Dimensions.get('window');
const DIAL_SIZE = Math.min(width * 0.7, 300);
const STROKE_WIDTH = 12;
const RADIUS = (DIAL_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface CentralDialProps {
    currentTemp: number;
    targetTemp: number;
    onTempChange: (temp: number) => void;
    minTemp?: number;
    maxTemp?: number;
}

// Create animated Circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CentralDial: React.FC<CentralDialProps> = ({
    currentTemp,
    targetTemp,
    onTempChange,
    minTemp = 5,
    maxTemp = 30,
}) => {
    // Calculate progress for the arc (0 to 1)
    const progress = (targetTemp - minTemp) / (maxTemp - minTemp);
    const animatedProgress = useRef(new Animated.Value(progress)).current;

    useEffect(() => {
        const newProgress = (targetTemp - minTemp) / (maxTemp - minTemp);
        Animated.spring(animatedProgress, {
            toValue: newProgress,
            damping: 15,
            stiffness: 100,
            useNativeDriver: false, // Must be false for SVG animations
        }).start();
    }, [targetTemp, minTemp, maxTemp]);

    // Interpolate for stroke dash offset
    const strokeDashoffset = animatedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [CIRCUMFERENCE, 0],
    });

    const handleIncrement = () => {
        if (targetTemp < maxTemp) {
            onTempChange(targetTemp + 0.5);
        }
    };

    const handleDecrement = () => {
        if (targetTemp > minTemp) {
            onTempChange(targetTemp - 0.5);
        }
    };

    return (
        <View style={styles.container}>
            {/* SVG Circle with Progress Arc */}
            <View style={styles.dialContainer}>
                <Svg width={DIAL_SIZE} height={DIAL_SIZE}>
                    <G rotation="-90" origin={`${DIAL_SIZE / 2}, ${DIAL_SIZE / 2}`}>
                        {/* Background Circle */}
                        <Circle
                            cx={DIAL_SIZE / 2}
                            cy={DIAL_SIZE / 2}
                            r={RADIUS}
                            stroke={COLORS.cardBg}
                            strokeWidth={STROKE_WIDTH}
                            fill="none"
                        />
                        {/* Progress Arc - Animated */}
                        <AnimatedCircle
                            cx={DIAL_SIZE / 2}
                            cy={DIAL_SIZE / 2}
                            r={RADIUS}
                            stroke={COLORS.primary}
                            strokeWidth={STROKE_WIDTH}
                            fill="none"
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                        />
                    </G>
                </Svg>

                {/* Center Content */}
                <View style={styles.centerContent}>
                    <Text style={styles.currentTempLabel}>Current</Text>
                    <Text style={styles.currentTemp}>{currentTemp.toFixed(1)}°</Text>
                    <View style={styles.divider} />
                    <Text style={styles.targetTempLabel}>Target</Text>
                    <Text style={styles.targetTemp}>{targetTemp.toFixed(1)}°</Text>
                </View>
            </View>

            {/* Control Buttons */}
            <View style={styles.controls}>
                <TouchableOpacity
                    style={[styles.button, targetTemp <= minTemp && styles.buttonDisabled]}
                    onPress={handleDecrement}
                    activeOpacity={0.7}
                    disabled={targetTemp <= minTemp}
                >
                    <Minus size={32} color={COLORS.white} strokeWidth={2.5} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, targetTemp >= maxTemp && styles.buttonDisabled]}
                    onPress={handleIncrement}
                    activeOpacity={0.7}
                    disabled={targetTemp >= maxTemp}
                >
                    <Plus size={32} color={COLORS.white} strokeWidth={2.5} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl,
    },
    dialContainer: {
        width: DIAL_SIZE,
        height: DIAL_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    centerContent: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    currentTempLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.xs,
    },
    currentTemp: {
        fontSize: 48,
        fontWeight: '700',
        color: COLORS.textPrimary,
        letterSpacing: -2,
    },
    divider: {
        width: 60,
        height: 2,
        backgroundColor: COLORS.cardBg,
        marginVertical: SPACING.sm,
        borderRadius: 1,
    },
    targetTempLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.xs,
    },
    targetTemp: {
        fontSize: 32,
        fontWeight: '600',
        color: COLORS.primary,
        letterSpacing: -1,
    },
    controls: {
        flexDirection: 'row',
        gap: SPACING.lg,
        marginTop: SPACING.xl,
    },
    button: {
        width: 64,
        height: 64,
        borderRadius: BORDER_RADIUS.standard,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.large,
    },
    buttonDisabled: {
        backgroundColor: COLORS.textSecondary,
        opacity: 0.5,
    },
});

export default CentralDial;
