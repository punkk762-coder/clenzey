export type SemanticTone = 'primary' | 'success' | 'warning' | 'error' | 'info';

export interface SemanticToneColors {
  foreground: string;
  background: string;
  border: string;
  muted: string;
  onForeground: string;
}

export const semanticTones: Record<SemanticTone, SemanticToneColors> = {
  primary: {
    foreground: '#0043BA',
    background: '#EFF6FF',
    border: '#BFDBFE',
    muted: '#93B4E8',
    onForeground: '#FFFFFF',
  },
  success: {
    foreground: '#28A745',
    background: '#F0FDF4',
    border: '#BBF7D0',
    muted: '#86EFAC',
    onForeground: '#FFFFFF',
  },
  warning: {
    foreground: '#D97706',
    background: '#FFFBEB',
    border: '#FDE68A',
    muted: '#FCD34D',
    onForeground: '#FFFFFF',
  },
  error: {
    foreground: '#DC3545',
    background: '#FEF2F2',
    border: '#FECACA',
    muted: '#FCA5A5',
    onForeground: '#FFFFFF',
  },
  info: {
    foreground: '#00B4D8',
    background: '#ECFEFF',
    border: '#A5F3FC',
    muted: '#67E8F9',
    onForeground: '#FFFFFF',
  },
};

export function getSemanticTone(tone: SemanticTone): SemanticToneColors {
  return semanticTones[tone];
}
