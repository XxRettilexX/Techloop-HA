import React from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../theme';
import { User, Settings, Bell, Shield, Info, LogOut } from 'lucide-react-native';

export const ProfileScreen: React.FC = () => {
    const { user, logout } = useAuth();

    const menuItems = [
        { icon: Settings, label: 'Settings', onPress: () => { } },
        { icon: Bell, label: 'Notifications', onPress: () => { } },
        { icon: Shield, label: 'Privacy & Security', onPress: () => { } },
        { icon: Info, label: 'About', onPress: () => { } },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.accent]}
                            style={styles.avatar}
                        >
                            <User size={40} color="#FFFFFF" />
                        </LinearGradient>
                    </View>
                    <Text style={styles.userName}>{user?.name || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
                </View>

                {/* Menu Items */}
                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuItem}
                            onPress={item.onPress}
                            activeOpacity={0.7}
                        >
                            <View style={styles.menuIconContainer}>
                                <item.icon size={22} color={COLORS.primary} />
                            </View>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={logout}
                    activeOpacity={0.8}
                >
                    <LogOut size={20} color={COLORS.error} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                {/* App Version */}
                <Text style={styles.versionText}>Version 1.0.0</Text>
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
        gap: SPACING.lg,
    },
    profileHeader: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    avatarContainer: {
        marginBottom: SPACING.md,
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.deep,
    },
    userName: {
        ...TYPOGRAPHY.h2,
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    userEmail: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
    },
    menuContainer: {
        gap: SPACING.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.md,
        gap: SPACING.md,
        ...SHADOWS.card,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabel: {
        ...TYPOGRAPHY.body,
        color: COLORS.text,
        flex: 1,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.md,
        gap: SPACING.sm,
        marginTop: SPACING.lg,
        ...SHADOWS.card,
    },
    logoutText: {
        ...TYPOGRAPHY.body,
        color: COLORS.error,
        fontWeight: '600',
    },
    versionText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.md,
    },
});
