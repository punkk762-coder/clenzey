import { LegalDocumentScreen } from '../../src/components/LegalDocumentScreen';
import { safetyGuaranteeDocument } from '../../src/content/legal/safety-guarantee';

export default function SafetyGuaranteeScreen() {
  return <LegalDocumentScreen document={safetyGuaranteeDocument} />;
}
