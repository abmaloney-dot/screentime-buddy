import type { ImageSourcePropType } from 'react-native';

/**
 * Background designs. Each layer is a white alpha mask (see assets/backgrounds),
 * tinted at runtime with a shade of the current colour theme, so every design
 * follows whatever theme is picked. Multi-colour designs were split into three
 * masks by tone, lightest first.
 */
export const BACKGROUNDS = {
  none: { label: 'None', layers: [] as ImageSourcePropType[] },
  topography: { label: 'Topography', layers: [require('../../assets/backgrounds/topography.png')] },
  floral: { label: 'Floral', layers: [require('../../assets/backgrounds/floral.png')] },
  hearts: { label: 'Hearts', layers: [require('../../assets/backgrounds/hearts.png')] },
  stripes: { label: 'Stripes', layers: [require('../../assets/backgrounds/stripes.png')] },
  waves: {
    label: 'Waves',
    layers: [
      require('../../assets/backgrounds/waves-0.png'),
      require('../../assets/backgrounds/waves-1.png'),
      require('../../assets/backgrounds/waves-2.png'),
    ],
  },
  blossoms: {
    label: 'Blossoms',
    layers: [
      require('../../assets/backgrounds/blossoms-0.png'),
      require('../../assets/backgrounds/blossoms-1.png'),
      require('../../assets/backgrounds/blossoms-2.png'),
    ],
  },
} satisfies Record<string, { label: string; layers: ImageSourcePropType[] }>;

export type BackgroundId = keyof typeof BACKGROUNDS;

/** How strongly the design shows. Text sits on the background in places, so it stays muted. */
export const STRENGTHS = {
  subtle: { label: 'Subtle', opacity: 0.25 },
  medium: { label: 'Medium', opacity: 0.45 },
  bold: { label: 'Bold', opacity: 0.7 },
} as const;

export type StrengthId = keyof typeof STRENGTHS;
