/**
 * Mandatory Color Palette - Clean Tech & Sophisticated
 * DO NOT MODIFY - Required by design system
 */

export const COLORS = {
    // Primary palette (mandatory)
    background: '#FFFFFF',      // Slate Blue - Main background
    textSecondary: '#2F3E46',   // Dark Charcoal - Secondary text
    textPrimary: '#00120b',     // Rich Black - Primary text
    primary: '#5171A5',         // Dark Cyan - Primary actions/active state
    cardBg: '#FFFFFF',          // White - Card backgrounds/highlights

    // Additional UI tokens
    accent: '#35605a',          // Dark Cyan (same as primary) for accents
    surface: '#FFFFFF',         // White - surface backgrounds
    text: '#00120b',            // Primary text (alias for textPrimary)
    border: '#9CA3AF',          // Border color
    disabled: '#b0b0b0',        // Disabled state color

    // Additional
    white: '#FFFFFF',
    black: '#000000',

    // Semantic colors
    success: '#10B981',
    warning: '#F77F00',
    danger: '#EF476F',
    error: '#EF476F',           // Alias for danger
    info: '#1A759F',
} as const;

export type ColorKey = keyof typeof COLORS;
