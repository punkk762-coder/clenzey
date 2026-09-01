/**
 * Validation utilities for the Consumer app.
 * All validators are pure functions: same input always produces the same output.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates an email address.
 * @returns null if valid, error message string if invalid.
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Email is required';
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
}

/**
 * Validates a phone number (exactly 10 digits).
 * @returns null if valid, error message string if invalid.
 */
export function validatePhone(phone: string): string | null {
  if (!phone) {
    return 'Phone number is required';
  }
  if (!PHONE_REGEX.test(phone)) {
    return 'Phone number must be exactly 10 digits';
  }
  return null;
}

/**
 * Validates a password (6–128 characters).
 * @returns null if valid, error message string if invalid.
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  if (password.length > 128) {
    return 'Password must be at most 128 characters';
  }
  return null;
}

/**
 * Validates a login identifier (must be a valid email OR a valid 10-digit phone).
 * @returns null if valid, error message string if invalid.
 */
function validateIdentifier(identifier: string): string | null {
  if (!identifier) {
    return 'Email or phone number is required';
  }
  const isValidEmail = EMAIL_REGEX.test(identifier);
  const isValidPhone = PHONE_REGEX.test(identifier);
  if (!isValidEmail && !isValidPhone) {
    return 'Please enter a valid email address or 10-digit phone number';
  }
  return null;
}

/**
 * Validates the login form fields.
 * The identifier must be a valid email or 10-digit phone number.
 */
export function validateLoginForm(identifier: string, password: string): ValidationResult {
  const errors: Record<string, string> = {};

  const identifierError = validateIdentifier(identifier);
  if (identifierError) {
    errors.identifier = identifierError;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.password = passwordError;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface ConsumerSignupForm {
  email: string;
  phone: string;
  password: string;
}

/**
 * Validates the consumer signup form fields.
 */
export function validateSignupForm(form: ConsumerSignupForm): ValidationResult {
  const errors: Record<string, string> = {};

  const emailError = validateEmail(form.email);
  if (emailError) {
    errors.email = emailError;
  }

  const phoneError = validatePhone(form.phone);
  if (phoneError) {
    errors.phone = phoneError;
  }

  const passwordError = validatePassword(form.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
