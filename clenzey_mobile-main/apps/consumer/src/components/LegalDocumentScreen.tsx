import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { colors, fonts } from '@clenzey/design-system';
import type { LegalDocument } from '../content/legal/types';

interface LegalDocumentScreenProps {
  document: LegalDocument;
}

export function LegalDocumentScreen({ document }: LegalDocumentScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updated}>Last updated: {document.lastUpdated}</Text>

        {document.intro?.map((paragraph) => (
          <Text key={paragraph} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}

        {document.sections.map((section) => (
          <View key={section.heading ?? section.paragraphs?.[0]} style={styles.section}>
            {section.heading ? <Text style={styles.heading}>{section.heading}</Text> : null}
            {section.paragraphs?.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
            {section.bullets?.map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <Text style={styles.bulletMarker}>•</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  updated: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  section: {
    marginTop: 20,
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  paragraph: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  bulletMarker: {
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 22,
    color: colors.primary,
    width: 12,
  },
  bulletText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textPrimary,
  },
});
