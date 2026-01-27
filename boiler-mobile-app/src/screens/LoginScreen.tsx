import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../theme';
import { Flame } from 'lucide-react-native';

export const LoginScreen: React.FC = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        setError('');

        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        setIsLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            setError('Invalid credentials. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Logo and Header */}
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <LinearGradient
                                colors={[COLORS.primary, COLORS.accent]}
                                style={styles.logoGradient}
                            >
                                <Flame size={48} color="#FFFFFF" />
                            </LinearGradient>
                        </View>
                        <Text style={styles.title}>Boiler Control</Text>
                        <Text style={styles.subtitle}>Smart heating management</Text>
                    </View>

                    {/* Login Form */}
                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor={COLORS.textSecondary}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                editable={!isLoading}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor={COLORS.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoCapitalize="none"
                                autoComplete="password"
                                editable={!isLoading}
                            />
                        </View>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <TouchableOpacity
                            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={isLoading ? [COLORS.disabled, COLORS.disabled] : [COLORS.primary, COLORS.accent]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.loginButtonGradient}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.loginButtonText}>Sign In</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.forgotPassword} disabled={isLoading}>
                            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Don't have an account?{' '}
                            <Text style={styles.footerLink}>Sign up</Text>
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: SPACING.xl,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        marginTop: SPACING.xl * 2,
    },
    logoContainer: {
        marginBottom: SPACING.lg,
    },
    logoGradient: {
        width: 96,
        height: 96,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.deep,
    },
    title: {
        ...TYPOGRAPHY.h1,
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    subtitle: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: SPACING.lg,
    },
    label: {
        ...TYPOGRAPHY.label,
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: SPACING.md,
        ...TYPOGRAPHY.body,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.card,
    },
    errorText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.error,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    loginButton: {
        borderRadius: 16,
        overflow: 'hidden',
        ...SHADOWS.deep,
        marginTop: SPACING.md,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonGradient: {
        padding: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
    },
    loginButtonText: {
        ...TYPOGRAPHY.button,
        color: '#FFFFFF',
    },
    forgotPassword: {
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    forgotPasswordText: {
        ...TYPOGRAPHY.body,
        color: COLORS.primary,
    },
    footer: {
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    footerText: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
    },
    footerLink: {
        color: COLORS.primary,
        fontWeight: '600',
    },
});
