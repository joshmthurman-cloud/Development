import { useWindowDimensions } from 'react-native';

const TABLET_BREAKPOINT = 768;

/** Phone container max width (e.g. for centered content). */
export const containerMaxWidthPhone = 560;

/** Tablet container max width. */
export const containerMaxWidthTablet = 820;

/** Current container max width based on breakpoint (560 phone, 820 tablet). */
export const containerMaxWidth = (width: number): number =>
  width >= TABLET_BREAKPOINT ? containerMaxWidthTablet : containerMaxWidthPhone;

/** Gutter: 16 phone, 24 tablet. */
export const gutterPhone = 16;
export const gutterTablet = 24;

export const gutter = (width: number): number =>
  width >= TABLET_BREAKPOINT ? gutterTablet : gutterPhone;

/** True when viewport width >= 768 (tablet/iPad). */
export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= TABLET_BREAKPOINT;
}

/** Responsive values: containerMaxWidth (560 phone / 820 tablet), gutter (16 / 24). */
export function useResponsive(): { isTablet: boolean; containerMaxWidth: number; gutter: number } {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  return {
    isTablet,
    containerMaxWidth: isTablet ? containerMaxWidthTablet : containerMaxWidthPhone,
    gutter: isTablet ? gutterTablet : gutterPhone,
  };
}
