import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAP_MIN_HERO_HEIGHT = 280;
const MAP_MAX_HERO_HEIGHT = 420;
const MAP_HEIGHT_RATIO = Platform.OS === 'web' ? 0.38 : 0.32;
const FOOTER_BASE_HEIGHT = 56;

export function useAddressMapLayout() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  return useMemo(() => {
    const heroHeight = Math.round(
      Math.min(
        MAP_MAX_HERO_HEIGHT,
        Math.max(MAP_MIN_HERO_HEIGHT, windowHeight * MAP_HEIGHT_RATIO),
      ),
    );
    const footerBottomInset = Math.max(insets.bottom, 10);

    return {
      heroHeight,
      mapViewHeight: heroHeight,
      backButtonTop: insets.top + 8,
      footerBottomInset,
      scrollBottomInset: FOOTER_BASE_HEIGHT + footerBottomInset + 8,
    };
  }, [insets.bottom, insets.top, windowHeight]);
}
