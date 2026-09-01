import { LegalDocumentScreen } from '../../src/components/LegalDocumentScreen';
import { privacyDocument } from '../../src/content/legal/privacy';

export default function PrivacyScreen() {
  return <LegalDocumentScreen document={privacyDocument} />;
}
