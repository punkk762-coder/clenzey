import { getSemanticTone, type SemanticTone } from '@clenzey/design-system';

export function getDialogToneStyles(tone: SemanticTone = 'primary') {
  const semantic = getSemanticTone(tone);

  return {
    semantic,
    submitButton: {
      backgroundColor: semantic.foreground,
    },
    submitButtonDisabled: {
      backgroundColor: semantic.muted,
    },
    submitButtonText: {
      color: semantic.onForeground,
    },
    selectedChip: {
      backgroundColor: semantic.foreground,
      borderColor: semantic.foreground,
    },
    selectedChipText: {
      color: semantic.onForeground,
    },
  } as const;
}
