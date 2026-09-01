import { ConflictError, UnauthorizedError } from "../../../errors/appErrors.ts";
import { hashPassword, verifyPassword } from "../../../utilities/passwordUtils.ts";
import * as partnerRepo from "./repository.ts";
import * as partnerService from "./service.ts";

// ── Helpers ─────────────────────────────────────────────────────────────────

function resolveIdentifierType(identifier: string): "email" | "phone" {
  if (identifier.includes("@")) return "email";
  if (identifier.startsWith("+")) return "phone";
  // Default to email for anything else — validation layer should prevent this
  return "email";
}

async function generateTokenPair(user: partnerRepo.PartnerUser) {
  return partnerService.generateTokenPair(user);
}

// ── Sign-Up ─────────────────────────────────────────────────────────────────

export const partnerSignUp = async (
  email: string,
  phone: string,
  password: string,
  fullName: string,
) => {
  // Check email uniqueness
  const existingByEmail = await partnerRepo.findUserByEmail(email);
  if (existingByEmail) {
    throw new ConflictError("Email is already registered");
  }

  // Check phone uniqueness
  const existingByPhone = await partnerRepo.findUserByPhone(phone);
  if (existingByPhone) {
    throw new ConflictError("Phone number is already registered");
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user + partner in transaction (approvalStatus = PENDING)
  const user = await partnerRepo.createPartnerWithPassword(
    email,
    phone,
    passwordHash,
    fullName,
  );

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokenPair(user);

  return {
    accessToken,
    approvalStatus: user.partner?.approvalStatus ?? "PENDING",
    refreshToken,
    user: {
      approvalStatus: user.partner?.approvalStatus ?? "PENDING",
      email: user.email,
      fullName: user.partner?.fullName ?? fullName,
      id: user.id,
      phone: user.phone,
    },
  };
};

// ── Sign-In ─────────────────────────────────────────────────────────────────

export const partnerSignIn = async (identifier: string, password: string) => {
  const identifierType = resolveIdentifierType(identifier);

  // Find user by identifier
  const user =
    identifierType === "email"
      ? await partnerRepo.findUserByEmail(identifier)
      : await partnerRepo.findUserByPhone(identifier);

  // Anti-enumeration: all failures return the same generic error
  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  // Verify password
  if (!user.passwordHash) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    throw new UnauthorizedError("Invalid credentials");
  }

  // Check partner role record exists
  if (!user.partner) {
    throw new UnauthorizedError("Invalid credentials");
  }

  // Check account is active
  if (!user.isActive) {
    throw new UnauthorizedError("Invalid credentials");
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateTokenPair(user);

  return {
    accessToken,
    approvalStatus: user.partner.approvalStatus,
    refreshToken,
    user: {
      approvalStatus: user.partner.approvalStatus,
      email: user.email,
      fullName: user.partner.fullName,
      id: user.id,
      phone: user.phone,
    },
  };
};
