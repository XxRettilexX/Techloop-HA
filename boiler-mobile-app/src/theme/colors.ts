/**
 * Mandatory Color Palette - Clean Tech & Sophisticated
 * DO NOT MODIFY - Required by design system
 */

export const COLORS = {
    // Primary palette (mandatory)
    background: '#aaabbc',      // Grigio Lavanda - Main background
    textSecondary: '#8b8982',   // Taupe/Oliva - Secondary text
    textPrimary: '#373f47',     // Antracite scuro - Primary text
    primary: '#6c91c2',         // Blu Acciaio - Primary actions/active state
    cardBg: '#c3c9e9',          // Periwinkle chiaro - Card backgrounds/highlights

    // Additional UI tokens
    accent: '#4A7BA7',          // Darker blue for accents
    surface: '#c3c9e9',         // Same as cardBg - surface backgrounds
    text: '#373f47',            // Primary text (alias for textPrimary)
    border: '#9CA3AF',          // Border color
    disabled: '#b0b0b0',        // Disabled state color

    // Additional
    white: '#FFFFFF',
    black: '#000000',

    // Semantic colors
    success: '#06D6A0',
    warning: '#F77F00',
    danger: '#EF476F',
    error: '#EF476F',           // Alias for danger
    info: '#1A759F',
} as const;

export type ColorKey = keyof typeof COLORS;
