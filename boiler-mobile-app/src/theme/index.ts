/**
 * Theme - Central export of all design system tokens
 */

export { COLORS, type ColorKey } from './colors';
export { SPACING, type SpacingKey } from './spacing';
export { TYPOGRAPHY, type TypographyKey } from './typography';
export { SHADOWS, type ShadowKey } from './shadows';
export { BORDER_RADIUS, type BorderRadiusKey } from './borderRadius';

// Theme object for convenience
import { COLORS } from './colors';
import { SPACING } from './spacing';
import { TYPOGRAPHY } from './typography';
import { SHADOWS } from './shadows';
import { BORDER_RADIUS } from './borderRadius';

export const theme = {
    colors: COLORS,
    spacing: SPACING,
    typography: TYPOGRAPHY,
    shadows: SHADOWS,
    borderRadius: BORDER_RADIUS,
} as const;

export type Theme = typeof theme;
