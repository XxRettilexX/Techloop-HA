/**
 * Border Radius - Extremely rounded components (32px standard)
 * Mandatory for all primary components
 */

export const BORDER_RADIUS = {
    // Standard for all main components
    standard: 32,

    // For smaller elements
    small: 16,

    // Chat bubbles (asymmetric)
    chat: {
        user: {
            topLeft: 20,
            topRight: 24,
            bottomRight: 24,
            bottomLeft: 4,
        },
        bot: {
            topLeft: 24,
            topRight: 20,
            bottomRight: 4,
            bottomLeft: 24,
        },
    },

    // Full circle
    circle: 9999,
} as const;

export type BorderRadiusKey = keyof typeof BORDER_RADIUS;
