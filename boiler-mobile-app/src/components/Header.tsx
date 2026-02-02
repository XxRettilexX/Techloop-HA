import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Menu, User } from 'lucide-react-native';
import { COLORS, SHADOWS, TYPOGRAPHY, SPACING } from '../theme';

interface HeaderProps {
    title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
    const navigation = useNavigation();

    return (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.headerButton}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Settings' as any)}
            >
                <Menu size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{title}</Text>

            <TouchableOpacity
                style={styles.headerButton}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Profile' as any)}
            >
                <User size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.background,
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
});
