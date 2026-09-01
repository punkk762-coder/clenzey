import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { BackButtonSurface, BACK_BUTTON_HEADER_SIZE } from './BackButton';

interface StackBackButtonProps {
  fallbackRoute?: Href;
}

/** Matches typical iOS native-stack leading header slot width for centered titles. */
const IOS_HEADER_LEFT_SLOT_WIDTH = 88;
const HEADER_EDGE_PADDING = 16;

/**
 * Native-stack left header subviews center narrow children. A fixed-width slot
 * plus a negative margin pulls the button to the leading edge at 16px.
 */
const IOS_LEFT_CENTERING_OFFSET = (IOS_HEADER_LEFT_SLOT_WIDTH - BACK_BUTTON_HEADER_SIZE) / 2;

export function StackBackButton({ fallbackRoute = '/(tabs)/profile' }: StackBackButtonProps) {
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

/** Shared native-stack chrome for centered titles with a custom back button. */
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
