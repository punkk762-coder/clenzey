import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Searchbar, Text } from 'react-native-paper';
import { colors, controlSizes } from '@clenzey/design-system';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  suggestions?: string[];
  onSuggestionPress?: (suggestion: string) => void;
}

export function SearchBar({
  placeholder = 'Search...',
  value,
  onChangeText,
  suggestions = [],
  onSuggestionPress,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const showSuggestions = isFocused && value.length > 0 && suggestions.length > 0;

  return (
    <View style={styles.wrapper}>
      <Searchbar
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        style={[styles.searchbar, isFocused && styles.searchbarActive]}
        inputStyle={styles.input}
        iconColor={isFocused ? colors.primary : colors.textPrimary}
        placeholderTextColor={colors.textSecondary}
      />
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => onSuggestionPress?.(suggestion)}
              activeOpacity={0.7}
            >
              <Text variant="bodyMedium" style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 10 },
  searchbar: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 10,
    elevation: 0,
    borderWidth: 1,
    borderColor: 'transparent',
    height: controlSizes.input.height,
  },
  searchbarActive: { borderColor: colors.primary, backgroundColor: colors.white },
  input: { fontSize: controlSizes.input.fontSize, color: colors.textPrimary },
  suggestionsContainer: {
    position: 'absolute',
    top: controlSizes.input.height + 4,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 0,
    zIndex: 20,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  suggestionText: { color: colors.textPrimary },
});
