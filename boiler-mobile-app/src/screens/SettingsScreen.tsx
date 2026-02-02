import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Bell, Shield, CircleHelp, LogOut } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../theme';
import { useAuth } from '../contexts/AuthContext';

export const SettingsScreen: React.FC = () => {
    const navigation = useNavigation();
    const { logout } = useAuth();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const handleLogout = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: () => logout()
                }
            ]
        );
    };

    const SettingItem = ({ icon: Icon, label, onPress, value, type = 'link' }: any) => (
        <TouchableOpacity
            style={styles.settingItem}
            onPress={onPress}
            activeOpacity={type === 'link' ? 0.7 : 1}
        >
            <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: label === 'Sign Out' ? '#FFF0F0' : '#F0F9FF' }]}>
                    <Icon size={20} color={label === 'Sign Out' ? COLORS.danger : COLORS.primary} />
                </View>
                <Text style={[styles.settingLabel, label === 'Sign Out' && styles.dangerLabel]}>{label}</Text>
            </View>
            {type === 'toggle' ? (
                <Switch
                    value={value}
                    onValueChange={onPress}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                />
            ) : (
                <View />
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.navigate('MainApp' as any);
                        }
                    }}
                >
                    <ChevronLeft size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={styles.card}>
                        <SettingItem
                            icon={Bell}
                            label="Push Notifications"
                            type="toggle"
                            value={notificationsEnabled}
                            onPress={() => setNotificationsEnabled(!notificationsEnabled)}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support</Text>
                    <View style={styles.card}>
                        <SettingItem
                            icon={Shield}
                            label="Privacy Policy"
                            onPress={() => Alert.alert('Info', 'Privacy Policy placeholder')}
                        />
                        <View style={styles.divider} />
                        <SettingItem
                            icon={CircleHelp}
                            label="Help & Support"
                            onPress={() => Alert.alert('Info', 'Help Center placeholder')}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.card}>
                        <SettingItem
                            icon={LogOut}
                            label="Sign Out"
                            onPress={handleLogout}
                        />
                    </View>
                </View>

                <Text style={styles.version}>Version 1.0.0</Text>
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
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    headerTitle: {
        ...TYPOGRAPHY.h2,
        color: COLORS.textPrimary,
    },
    content: {
        padding: SPACING.md,
        gap: SPACING.xl,
    },
    section: {
        gap: SPACING.sm,
    },
    sectionTitle: {
        ...TYPOGRAPHY.label,
        marginLeft: SPACING.xs,
        opacity: 0.7,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: SPACING.sm,
        ...SHADOWS.small,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingLabel: {
        ...TYPOGRAPHY.body,
        fontWeight: '500',
    },
    dangerLabel: {
        color: COLORS.danger,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginLeft: 58,
    },
    version: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        opacity: 0.5,
        marginTop: SPACING.xl,
    },
});
