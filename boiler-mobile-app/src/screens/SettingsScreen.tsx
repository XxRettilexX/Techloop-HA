import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Bell, Shield, CircleHelp, LogOut, Database, Trash2, RefreshCw } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { API_CONFIG } from '../config/api';

interface CacheStats {
    hits: number;
    misses: number;
    hit_rate: number;
    total_entries: number;
    memory_usage_mb?: number;
}

export const SettingsScreen: React.FC = () => {
    const navigation = useNavigation();
    const { logout } = useAuth();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
    const [isCacheLoading, setIsCacheLoading] = useState(false);
    const [isCacheClearing, setIsCacheClearing] = useState(false);

    // Fetch cache stats
    const fetchCacheStats = useCallback(async () => {
        setIsCacheLoading(true);
        try {
            const response = await fetch(`${API_CONFIG.chatbot}/cache/stats`);
            if (response.ok) {
                const data = await response.json();
                setCacheStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch cache stats:', error);
        } finally {
            setIsCacheLoading(false);
        }
    }, []);

    // Clear cache
    const handleClearCache = useCallback(async () => {
        Alert.alert(
            "Svuota Cache AI",
            "Sei sicuro di voler svuotare la cache? Questo potrebbe rallentare temporaneamente le risposte dell'AI.",
            [
                { text: "Annulla", style: "cancel" },
                {
                    text: "Svuota",
                    style: "destructive",
                    onPress: async () => {
                        setIsCacheClearing(true);
                        try {
                            const response = await fetch(`${API_CONFIG.chatbot}/cache/clear`, {
                                method: 'POST',
                            });
                            if (response.ok) {
                                Alert.alert('Successo', 'Cache svuotata con successo');
                                fetchCacheStats();
                            } else {
                                Alert.alert('Errore', 'Impossibile svuotare la cache');
                            }
                        } catch (error) {
                            console.error('Failed to clear cache:', error);
                            Alert.alert('Errore', 'Errore di connessione');
                        } finally {
                            setIsCacheClearing(false);
                        }
                    }
                }
            ]
        );
    }, [fetchCacheStats]);

    // Load cache stats on mount
    useEffect(() => {
        fetchCacheStats();
    }, [fetchCacheStats]);

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

                {/* AI Cache Section - New */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>AI Cache Performance</Text>
                    <View style={styles.card}>
                        <View style={styles.cacheStatsContainer}>
                            {isCacheLoading ? (
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            ) : cacheStats ? (
                                <>
                                    <View style={styles.cacheStatRow}>
                                        <Text style={styles.cacheLabel}>Hit Rate:</Text>
                                        <Text style={[
                                            styles.cacheValue,
                                            cacheStats.hit_rate > 70 ? styles.cacheGood :
                                                cacheStats.hit_rate > 40 ? styles.cacheWarning : styles.cacheBad
                                        ]}>
                                            {cacheStats.hit_rate.toFixed(1)}%
                                        </Text>
                                    </View>
                                    <View style={styles.cacheStatRow}>
                                        <Text style={styles.cacheLabel}>Hits / Misses:</Text>
                                        <Text style={styles.cacheValue}>
                                            {cacheStats.hits} / {cacheStats.misses}
                                        </Text>
                                    </View>
                                    <View style={styles.cacheStatRow}>
                                        <Text style={styles.cacheLabel}>Total Entries:</Text>
                                        <Text style={styles.cacheValue}>{cacheStats.total_entries}</Text>
                                    </View>
                                    {cacheStats.memory_usage_mb && (
                                        <View style={styles.cacheStatRow}>
                                            <Text style={styles.cacheLabel}>Memory:</Text>
                                            <Text style={styles.cacheValue}>
                                                {cacheStats.memory_usage_mb.toFixed(2)} MB
                                            </Text>
                                        </View>
                                    )}
                                </>
                            ) : (
                                <Text style={styles.cacheErrorText}>
                                    Impossibile caricare le statistiche
                                </Text>
                            )}
                        </View>
                        <View style={styles.cacheActions}>
                            <TouchableOpacity
                                style={styles.cacheActionButton}
                                onPress={fetchCacheStats}
                                disabled={isCacheLoading}
                            >
                                <RefreshCw size={18} color={COLORS.primary} />
                                <Text style={styles.cacheActionText}>Aggiorna</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.cacheActionButton, styles.cacheActionDanger]}
                                onPress={handleClearCache}
                                disabled={isCacheClearing}
                            >
                                {isCacheClearing ? (
                                    <ActivityIndicator size="small" color={COLORS.danger} />
                                ) : (
                                    <Trash2 size={18} color={COLORS.danger} />
                                )}
                                <Text style={[styles.cacheActionText, styles.cacheActionDangerText]}>
                                    Svuota Cache
                                </Text>
                            </TouchableOpacity>
                        </View>
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
    // Cache Stats styles
    cacheStatsContainer: {
        padding: SPACING.md,
        minHeight: 80,
        justifyContent: 'center',
    },
    cacheStatRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: SPACING.xs,
    },
    cacheLabel: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
    },
    cacheValue: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    cacheGood: {
        color: COLORS.success || '#10B981',
    },
    cacheWarning: {
        color: COLORS.warning || '#F59E0B',
    },
    cacheBad: {
        color: COLORS.danger,
    },
    cacheErrorText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    cacheActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    cacheActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm,
        gap: SPACING.xs,
    },
    cacheActionText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.primary,
        fontWeight: '600',
    },
    cacheActionDanger: {},
    cacheActionDangerText: {
        color: COLORS.danger,
    },
});
