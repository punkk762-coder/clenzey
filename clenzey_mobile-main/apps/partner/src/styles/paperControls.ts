import {
  controlSizes,
  paperInputContentStyle,
  paperInputTextStyle,
  paperButtonContentStyle,
  paperButtonLabelStyle,
} from '@clenzey/design-system';

export {
  controlSizes,
  paperInputContentStyle,
  paperInputTextStyle,
  paperButtonContentStyle,
  paperButtonLabelStyle,
};

/** Shared Paper component sizing — tracks design-system controlSizes */
export const sharedPaperStyles = {
  input: { fontSize: controlSizes.input.fontSize },
  inputContent: paperInputContentStyle,
  buttonContent: paperButtonContentStyle,
  buttonLabel: paperButtonLabelStyle,
} as const;
