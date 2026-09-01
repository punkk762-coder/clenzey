import { Alert, Linking } from 'react-native';

export const WHATSAPP_SUPPORT_URL = 'https://wa.me/917008410996';

export async function openExternalLink(url: string, label: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Unavailable', `${label} is not available right now.`);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Error', `Could not open ${label.toLowerCase()}.`);
  }
}

export async function openWhatsAppSupport(): Promise<void> {
  await openExternalLink(WHATSAPP_SUPPORT_URL, 'Help & Support');
}
