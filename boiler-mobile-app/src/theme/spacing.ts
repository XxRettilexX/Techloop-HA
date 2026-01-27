/**
 * Spacing Scale - Consistent spacing throughout app
 */

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
} as const;

export type SpacingKey = keyof typeof SPACING;
