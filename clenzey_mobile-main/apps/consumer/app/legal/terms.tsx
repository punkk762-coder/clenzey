import { LegalDocumentScreen } from '../../src/components/LegalDocumentScreen';
import { termsDocument } from '../../src/content/legal/terms';

export default function TermsScreen() {
  return <LegalDocumentScreen document={termsDocument} />;
}
