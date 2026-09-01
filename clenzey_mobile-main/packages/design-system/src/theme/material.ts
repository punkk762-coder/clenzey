import { Platform, ViewStyle } from 'react-native';

export type MaterialPreset =
  | 'card'
  | 'cardRaised'
  | 'cardSelected'
  | 'button'
  | 'buttonPressed'
  | 'chip'
  | 'chipRaised'
  | 'tabActive'
  | 'tabInactive'
  | 'trough'
  | 'floating'
  | 'barTop'
  | 'input'
  | 'iconWrap';

type MaterialDefinition = {
  ios: ViewStyle;
  android: ViewStyle;
  web: ViewStyle;
};

const MATERIAL: Record<MaterialPreset, MaterialDefinition> = {
  card: {
    ios: {
      shadowColor: '#03045E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 3,
    },
    android: { elevation: 3 },
    web: {
      boxShadow: '0 2px 8px rgba(3, 4, 94, 0.08)',
    },
  },
  cardRaised: {
    ios: {
      shadowColor: '#03045E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 14,
      elevation: 6,
    },
    android: { elevation: 6 },
    web: {
      boxShadow: '0 4px 16px rgba(3, 4, 94, 0.1)',
    },
  },
  cardSelected: {
    ios: {
      shadowColor: '#0043BA',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    },
    android: { elevation: 8 },
    web: {
      boxShadow: '0 4px 16px rgba(0, 67, 186, 0.18), 0 0 0 1px rgba(0, 67, 186, 0.08)',
    },
  },
  button: {
    ios: {
      shadowColor: '#0043BA',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 8,
      elevation: 6,
    },
    android: { elevation: 6 },
    web: {
      boxShadow: '0 4px 12px rgba(0, 67, 186, 0.28)',
    },
  },
  buttonPressed: {
    ios: {
      shadowColor: '#0043BA',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 2,
    },
    android: { elevation: 2 },
    web: {
      boxShadow: '0 2px 6px rgba(0, 67, 186, 0.2)',
    },
  },
  chip: {
    ios: {
      shadowColor: '#03045E',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    android: { elevation: 2 },
    web: {
      boxShadow: '0 1px 3px rgba(3, 4, 94, 0.08)',
    },
  },
  chipRaised: {
    ios: {
      shadowColor: '#03045E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
    },
    android: { elevation: 3 },
    web: {
      boxShadow: '0 2px 6px rgba(3, 4, 94, 0.12)',
    },
  },
  tabActive: {
    ios: {
      shadowColor: '#0043BA',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.24,
      shadowRadius: 6,
      elevation: 5,
    },
    android: { elevation: 5 },
    web: {
      boxShadow: '0 4px 12px rgba(0, 67, 186, 0.28)',
    },
  },
  tabInactive: {
    ios: {
      shadowColor: '#03045E',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    android: { elevation: 1 },
    web: {
      boxShadow: '0 1px 2px rgba(3, 4, 94, 0.06)',
    },
  },
  trough: {
    ios: {
      shadowColor: '#03045E',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 0,
    },
    android: { elevation: 0 },
    web: {},
  },
  floating: {
    ios: {
      shadowColor: '#03045E',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 18,
      elevation: 10,
    },
    android: { elevation: 10 },
    web: {
      boxShadow: '0 8px 24px rgba(3, 4, 94, 0.14)',
    },
  },
  barTop: {
    ios: {
      shadowColor: '#03045E',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    android: { elevation: 8 },
    web: {
      boxShadow: '0 -4px 16px rgba(3, 4, 94, 0.1)',
    },
  },
  input: {
    ios: {
      shadowColor: '#03045E',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    android: { elevation: 1 },
    web: {
      boxShadow: '0 1px 2px rgba(3, 4, 94, 0.04)',
    },
  },
  iconWrap: {
    ios: {
      shadowColor: '#0043BA',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    android: { elevation: 3 },
    web: {
      boxShadow: '0 2px 6px rgba(0, 67, 186, 0.18)',
    },
  },
};

export function materialStyle(preset: MaterialPreset): ViewStyle {
  const definition = MATERIAL[preset];
  return Platform.select({
    ios: definition.ios,
    android: definition.android,
    default: definition.web,
  }) as ViewStyle;
}

export function materialPressedStyle(
  preset: 'button' | 'card' | 'tab' | 'chip',
): ViewStyle {
  switch (preset) {
    case 'button':
      return materialStyle('buttonPressed');
    case 'card':
      return {
        ...materialStyle('card'),
        opacity: 0.96,
      };
    case 'tab':
      return {
        ...materialStyle('tabInactive'),
        opacity: 0.92,
      };
    case 'chip':
      return {
        opacity: 0.88,
      };
  }
}
