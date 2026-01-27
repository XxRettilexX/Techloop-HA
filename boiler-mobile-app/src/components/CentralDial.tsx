import React, { useEffect, useRef } from 'react';
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
const DIAL_SIZE = Math.min(width * 0.65, 280);
const STROKE_WIDTH = 14;
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
    const animatedProgress = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    // Entrance animation
    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                damping: 12,
                stiffness: 80,
                useNativeDriver: true,
            }),
            Animated.timing(animatedProgress, {
                toValue: progress,
                duration: 1200,
                useNativeDriver: false,
            }),
        ]).start();
    }, []);

    // Update animation when target changes
    useEffect(() => {
        const newProgress = (targetTemp - minTemp) / (maxTemp - minTemp);
        Animated.spring(animatedProgress, {
            toValue: newProgress,
            damping: 15,
            stiffness: 100,
            useNativeDriver: false,
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
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
            {/* SVG Circle with Progress Arc */}
            <View style={styles.dialContainer}>
                <Svg width={DIAL_SIZE} height={DIAL_SIZE}>
                    <G rotation="-90" origin={`${DIAL_SIZE / 2}, ${DIAL_SIZE / 2}`}>
                        {/* Background Circle - Light Gray Track */}
                        <Circle
                            cx={DIAL_SIZE / 2}
                            cy={DIAL_SIZE / 2}
                            r={RADIUS}
                            stroke="#E5E7EB"
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
                    <Text style={styles.currentTemp}>{Math.round(currentTemp)}°</Text>
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
                    <Minus size={28} color={COLORS.white} strokeWidth={2.5} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, targetTemp >= maxTemp && styles.buttonDisabled]}
                    onPress={handleIncrement}
                    activeOpacity={0.7}
                    disabled={targetTemp >= maxTemp}
                >
                    <Plus size={28} color={COLORS.white} strokeWidth={2.5} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
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
    currentTemp: {
        fontSize: 56,
        fontWeight: '700',
        color: COLORS.textPrimary,
        letterSpacing: -2,
    },
    targetTemp: {
        fontSize: 22,
        fontWeight: '500',
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    controls: {
        flexDirection: 'row',
        gap: SPACING.xl,
        marginTop: SPACING.lg,
    },
    button: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.medium,
    },
    buttonDisabled: {
        backgroundColor: COLORS.textSecondary,
        opacity: 0.5,
    },
});

export default CentralDial;
