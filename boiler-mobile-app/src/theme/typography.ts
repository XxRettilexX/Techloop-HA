/**
 * Typography System - Font sizes and weights
 */

import { COLORS } from './colors';

export const TYPOGRAPHY = {
    hero: {
        fontSize: 48,
        fontWeight: '700' as const,
        color: COLORS.textPrimary,
        letterSpacing: -1,
    },
    h1: {
        fontSize: 32,
        fontWeight: '700' as const,
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    h2: {
        fontSize: 24,
        fontWeight: '600' as const,
        color: COLORS.textPrimary,
        letterSpacing: -0.3,
    },
    title: {
        fontSize: 24,
        fontWeight: '600' as const,
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600' as const,
        color: COLORS.textPrimary,
    },
    body: {
        fontSize: 16,
        fontWeight: '400' as const,
        color: COLORS.textPrimary,
    },
    bodySecondary: {
        fontSize: 16,
        fontWeight: '400' as const,
        color: COLORS.textSecondary,
    },
    label: {
        fontSize: 14,
        fontWeight: '500' as const,
        color: COLORS.textPrimary,
    },
    caption: {
        fontSize: 12,
        fontWeight: '400' as const,
        color: COLORS.textSecondary,
    },
    button: {
        fontSize: 16,
        fontWeight: '600' as const,
        letterSpacing: 0.5,
    },
} as const;

export type TypographyKey = keyof typeof TYPOGRAPHY;
