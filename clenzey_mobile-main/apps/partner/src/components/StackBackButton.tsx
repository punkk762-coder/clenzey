import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { BackButtonSurface, BACK_BUTTON_HEADER_SIZE } from './BackButton';

interface StackBackButtonProps {
  fallbackRoute?: Href;
}

const IOS_HEADER_LEFT_SLOT_WIDTH = 88;
const HEADER_EDGE_PADDING = 16;
const IOS_LEFT_CENTERING_OFFSET = (IOS_HEADER_LEFT_SLOT_WIDTH - BACK_BUTTON_HEADER_SIZE) / 2;

export function StackBackButton({ fallbackRoute = '/(tabs)' }: StackBackButtonProps) {
  const router = useRouter();

  return (
    <View style={styles.leftSlot}>
      <Pressable
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else if (fallbackRoute) {
            router.replace(fallbackRoute);
          }
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        {({ pressed }) => <BackButtonSurface pressed={pressed} variant="header" />}
      </Pressable>
    </View>
  );
}

export function StackHeaderSpacer() {
  return <View style={styles.rightSlot} />;
}

export const stackHeaderChrome = {
  headerBackVisible: false,
  headerLeft: () => <StackBackButton />,
  headerRight: () => <StackHeaderSpacer />,
  headerShadowVisible: false,
};

const styles = StyleSheet.create({
  leftSlot: {
    width: BACK_BUTTON_HEADER_SIZE,
    height: BACK_BUTTON_HEADER_SIZE,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginStart: Platform.select({
      ios: -IOS_LEFT_CENTERING_OFFSET,
      android: HEADER_EDGE_PADDING,
      default: HEADER_EDGE_PADDING,
    }),
  },
  rightSlot: {
    width: BACK_BUTTON_HEADER_SIZE,
    height: BACK_BUTTON_HEADER_SIZE,
    marginEnd: Platform.select({
      ios: -IOS_LEFT_CENTERING_OFFSET,
      android: HEADER_EDGE_PADDING,
      default: HEADER_EDGE_PADDING,
    }),
  },
});
