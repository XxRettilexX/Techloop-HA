/**
 * Shadow Styles - Deep and soft shadows (platform-specific)
 * Mandatory: Use these for all elevated components
 */

import { Platform, ViewStyle } from 'react-native';

export const SHADOWS = {
    small: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
        },
        android: {
            elevation: 2,
        },
    }) as ViewStyle,

    medium: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
        },
        android: {
            elevation: 4,
        },
    }) as ViewStyle,

    large: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
        },
        android: {
            elevation: 8,
        },
    }) as ViewStyle,

    // Additional shadows for navigation
    card: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
        },
        android: {
            elevation: 2,
        },
    }) as ViewStyle,

    deep: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
        },
        android: {
            elevation: 12,
        },
    }) as ViewStyle,
} as const;

export type ShadowKey = keyof typeof SHADOWS;
