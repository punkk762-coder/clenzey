import { Platform, Text, type TextStyle, type ViewStyle } from 'react-native';
import { Tabs } from 'expo-router';
import { getFocusedRouteNameFromRoute, type RouteProp, type ParamListBase } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Home01Icon, Calendar01Icon, UserCircleIcon } from '@hugeicons/core-free-icons';
import { tabBarOptions, TabBarWithShadow, colors } from '@clenzey/design-system';

function getDefaultTabBarStyle(bottomInset: number): ViewStyle {
  return Platform.select({
    web: {
      backgroundColor: colors.white,
      borderTopWidth: 0,
      paddingTop: 8,
      paddingBottom: bottomInset,
      height: 64 + bottomInset,
      width: '100%',
    },
    default: {
      backgroundColor: colors.white,
      borderTopWidth: 0,
      height: 58 + bottomInset,
      paddingTop: 8,
      paddingBottom: bottomInset,
      elevation: 0,
    },
  }) as ViewStyle;
}

function getTabBarStyleForNestedStack(
  route: RouteProp<ParamListBase, string>,
  bottomInset: number,
): ViewStyle {
  const focusedRoute = getFocusedRouteNameFromRoute(route);
  const hideTabBar = focusedRoute != null && focusedRoute !== 'index';

  if (hideTabBar) {
    return { display: 'none' };
  }

  return getDefaultTabBarStyle(bottomInset);
}

function TabIcon({
  icon,
  color,
  focused,
}: {
  icon: typeof Home01Icon;
  color: string;
  focused: boolean;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={focused ? 24 : 22}
      color={color}
      strokeWidth={focused ? 2 : 1.5}
    />
  );
}

function TabBarLabel({
  color,
  children,
}: {
  color: string;
  children: string;
}) {
  const labelStyle: TextStyle = {
    color,
    fontSize: tabBarOptions.labelStyle.fontSize,
    fontFamily: tabBarOptions.labelStyle.fontFamily,
    fontWeight: tabBarOptions.labelStyle.fontWeight,
    lineHeight: tabBarOptions.labelStyle.lineHeight,
    marginTop: 4,
    paddingBottom: Platform.OS === 'web' ? 4 : 2,
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  };

  return <Text style={labelStyle}>{children}</Text>;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      tabBar={(props) => <TabBarWithShadow {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tabBarOptions.activeTintColor,
        tabBarInactiveTintColor: tabBarOptions.inactiveTintColor,
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarLabel: ({ color, children }) => (
          <TabBarLabel color={color}>{String(children)}</TabBarLabel>
        ),
        tabBarStyle: getDefaultTabBarStyle(bottomInset),
        tabBarItemStyle: {
          paddingVertical: Platform.OS === 'web' ? 6 : 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Home01Icon} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={({ route }) => ({
          title: 'Bookings',
          tabBarAccessibilityLabel: 'Bookings tab',
          tabBarStyle: getTabBarStyleForNestedStack(route, bottomInset),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Calendar01Icon} color={color} focused={focused} />
          ),
        })}
      />
      <Tabs.Screen
        name="profile"
        options={({ route }) => ({
          title: 'Profile',
          headerShown: false,
          tabBarAccessibilityLabel: 'Profile tab',
          tabBarStyle: getTabBarStyleForNestedStack(route, bottomInset),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={UserCircleIcon} color={color} focused={focused} />
          ),
        })}
      />
    </Tabs>
  );
}
