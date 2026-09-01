import path from "node:path";
import { fileURLToPath } from "node:url";

import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import { envConfig } from "./environmentConfig.ts";

const swaggerComponents = {
  schemas: {
    // ── Auth shared ─────────────────────────────────────────────────────────
    FirebaseAuthRequest: {
      properties: {
        idToken: {
          description: "Firebase ID token from client-side phone OTP verification",
          type: "string",
        },
      },
      required: ["idToken"],
      type: "object",
    },

    TokenRefreshResponse: {
      properties: {
        data: {
          properties: {
            accessToken: { type: "string" },
            refreshToken: {
              description: "Returned for mobile clients (`X-Client-Platform: ios|android|mobile`)",
              type: "string",
            },
          },
          type: "object",
        },
        success: { example: true, type: "boolean" },
      },
      type: "object",
    },

    // ── Consumer ────────────────────────────────────────────────────────────
    ConsumerFirebaseAuthRequest: {
      allOf: [
        { $ref: "#/components/schemas/FirebaseAuthRequest" },
        {
          properties: {
            referralCode: {
              description: "Optional friend's referral code (new users only)",
              example: "CLNZ7E888C",
              maxLength: 32,
              type: "string",
            },
          },
          type: "object",
        },
      ],
    },

    ConsumerAuthResponse: {
      properties: {
        data: {
          properties: {
            accessToken: { type: "string" },
            isNewUser: { type: "boolean" },
            user: {
              properties: {
                fullName: { nullable: true, type: "string" },
                id: { format: "uuid", type: "string" },
                phone: { example: "+919876543210", type: "string" },
                referralCode: { example: "ABCD1234", type: "string" },
              },
              type: "object",
            },
          },
          type: "object",
        },
        success: { example: true, type: "boolean" },
      },
      type: "object",
    },

    // ── Partner ─────────────────────────────────────────────────────────────
    PartnerFirebaseAuthRequest: {
      allOf: [
        { $ref: "#/components/schemas/FirebaseAuthRequest" },
        {
          properties: {
            fullName: {
              description: "Optional on first sign-up",
              maxLength: 100,
              minLength: 2,
              type: "string",
            },
          },
          type: "object",
        },
      ],
    },

    PartnerAuthResponse: {
      properties: {
        data: {
          properties: {
            accessToken: { type: "string" },
            refreshToken: {
              description: "Returned for mobile clients (`X-Client-Platform: ios|android|mobile`)",
              type: "string",
            },
            approvalStatus: {
              enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"],
              type: "string",
            },
            isNewPartner: { type: "boolean" },
            user: {
              properties: {
                fullName: { nullable: true, type: "string" },
                id: { format: "uuid", type: "string" },
                phone: { example: "+919876543210", type: "string" },
              },
              type: "object",
            },
          },
          type: "object",
        },
        success: { example: true, type: "boolean" },
      },
      type: "object",
    },

    // ── Consumer password auth ──────────────────────────────────────────────
    ConsumerPasswordSignUpRequest: {
      properties: {
        email: { example: "priya@example.com", format: "email", maxLength: 254, type: "string" },
        password: { example: "SecureP@ss1", maxLength: 72, minLength: 8, type: "string" },
        phone: { example: "+919876543210", type: "string" },
        referralCode: {
          description: "Optional friend's referral code",
          example: "CLNZ7E888C",
          maxLength: 32,
          type: "string",
        },
      },
      required: ["email", "phone", "password"],
      type: "object",
    },

    ConsumerPasswordSignUpResponse: {
      properties: {
        data: {
          properties: {
            accessToken: { example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", type: "string" },
            user: {
              properties: {
                email: { example: "priya@example.com", type: "string" },
                id: { example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", format: "uuid", type: "string" },
                phone: { example: "+919876543210", type: "string" },
                referralCode: { example: "ABCD1234", nullable: true, type: "string" },
              },
              type: "object",
            },
          },
          type: "object",
        },
        success: { example: true, type: "boolean" },
      },
      type: "object",
    },

    ApplyReferralRequest: {
      properties: {
        referralCode: { example: "CLNZ7E888C", maxLength: 32, type: "string" },
      },
      required: ["referralCode"],
      type: "object",
    },

    ReferralReward: {
      properties: {
        couponCode: { example: "RWD-ABC12345", type: "string" },
        discountType: { enum: ["FLAT", "PERCENTAGE"], type: "string" },
        discountValue: { example: 200, type: "number" },
        minOrderAmount: { example: 799, type: "number" },
        redeemed: { example: false, type: "boolean" },
        role: { enum: ["REFEREE", "REFERRER"], type: "string" },
        validUntil: { format: "date-time", nullable: true, type: "string" },
      },
      type: "object",
    },

    ReferralMeResponse: {
      properties: {
        data: {
          properties: {
            appliedReferral: {
              nullable: true,
              properties: {
                appliedAt: { format: "date-time", type: "string" },
                referralCode: { example: "CLNZ7E888C", type: "string" },
              },
              type: "object",
            },
            hasAppliedReferral: { example: false, type: "boolean" },
            referralCode: { example: "CLNZ7E888C", type: "string" },
            rewards: {
              properties: {
                received: {
                  items: { $ref: "#/components/schemas/ReferralReward" },
                  type: "array",
                },
                referralsMade: {
                  items: {
                    properties: {
                      appliedAt: { format: "date-time", type: "string" },
                      refereeRewardIssued: { example: true, type: "boolean" },
                    },
                    type: "object",
                  },
                  type: "array",
                },
              },
              type: "object",
            },
            shareMessage: { example: "Join Clenzey with my code CLNZ7E888C and get ₹200 off your first booking!", type: "string" },
          },
          type: "object",
        },
        success: { example: true, type: "boolean" },
      },
      type: "object",
    },

    ApplyReferralResponse: {
      properties: {
        data: {
          properties: {
            referral: {
              properties: {
                appliedAt: { format: "date-time", type: "string" },
                referrerId: { format: "uuid", type: "string" },
              },
              type: "object",
            },
            referrerNotified: { example: true, type: "boolean" },
            yourReward: {
              properties: {
                couponCode: { example: "RWD-ABC12345", type: "string" },
                discountValue: { example: 200, type: "number" },
                minOrderAmount: { example: 799, type: "number" },
                validUntil: { format: "date-time", nullable: true, type: "string" },
              },
              type: "object",
            },
          },
          type: "object",
        },
        success: { example: true, type: "boolean" },
      },
      type: "object",
    },

    SignInRequest: {
      properties: {
        identifier: {
          description: "Email address or phone number (E.164)",
          example: "priya@example.com",
          type: "string",
        },
        password: { example: "SecureP@ss1", maxLength: 128, minLength: 8, type: "string" },
      },
      required: ["identifier", "password"],
      type: "object",
    },

    ConsumerSignInResponse: {
      properties: {
        data: {
          properties: {
            accessToken: { example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", type: "string" },
            user: {
              properties: {
                email: { example: "priya@example.com", nullable: true, type: "string" },
                fullName: { example: "Priya Sharma", nullable: true, type: "string" },
                id: { example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", format: "uuid", type: "string" },
                phone: { example: "+919876543210", type: "string" },
              },
              type: "object",
            },
          },
          type: "object",
        },
        success: { example: true, type: "boolean" },
      },
      type: "object",
    },

    // ── Partner password auth ───────────────────────────────────────────────
    PartnerSignUpRequest: {
      properties: {
        email: { example: "amit@example.com", format: "email", maxLength: 254, type: "string" },
        fullName: { example: "Amit Sharma", maxLength: 100, minLength: 2, type: "string" },
        password: { example: "SecureP@ss1", maxLength: 72, minLength: 8, type: "string" },
        phone: { example: "+919876543210", type: "string" },
      },
      required: ["email", "phone", "password", "fullName"],
      type: "object",
    },

    PartnerSignUpResponse: {
      properties: {
        data: {
          properties: {
            accessToken: { example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", type: "string" },
            approvalStatus: { example: "PENDING", enum: ["PENDING"], type: "string" },
            user: {
              properties: {
                email: { example: "amit@example.com", type: "string" },
                fullName: { example: "Amit Sharma", type: "string" },
                id: { example: "b2c3d4e5-f6a7-8901-bcde-f12345678901", format: "uuid", type: "string" },
                phone: { example: "+919876543210", type: "string" },
              },
              type: "object",
            },
          },
          type: "object",
        },
        success: { example: true, type: "boolean" },
      },
      type: "object",
    },

    PartnerSignInResponse: {
      properties: {
        data: {
          properties: {
            accessToken: { example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", type: "string" },
            approvalStatus: {
              enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"],
              example: "APPROVED",
              type: "string",
            },
            user: {
              properties: {
                email: { example: "amit@example.com", nullable: true, type: "string" },
                fullName: { example: "Amit Sharma", nullable: true, type: "string" },
                id: { example: "b2c3d4e5-f6a7-8901-bcde-f12345678901", format: "uuid", type: "string" },
                phone: { example: "+919876543210", type: "string" },
              },
              type: "object",
            },
          },
          type: "object",
        },
        success: { example: true, type: "boolean" },
      },
      type: "object",
    },

    // ── Admin ────────────────────────────────────────────────────────────────
    AdminOtpValidateRequest: {
      properties: {
        secret: { description: "6-digit OTP", example: "123456", maxLength: 6, minLength: 6, type: "string" },
        token: { description: "Verification SID from initiate response", type: "string" },
      },
      required: ["token", "secret"],
      type: "object",
    },

    AdminAuthResponse: {
      properties: {
        data: {
          properties: {
            accessToken: { type: "string" },
            user: {
              properties: {
                id: { format: "uuid", type: "string" },
                phone: { example: "+919876543210", type: "string" },
                role: {
                  enum: ["OPERATIONS", "SUPPORT", "FINANCE", "SUPER_ADMIN"],
                  type: "string",
                },
              },
              type: "object",
            },
          },
          type: "object",
        },
        success: { example: true, type: "boolean" },
      },
      type: "object",
    },

    // ── Admin · Network (consumers / partners) ──────────────────────────────
    AdminConsumer: {
      properties: {
        createdAt: { format: "date-time", type: "string" },
        fullName: { nullable: true, type: "string" },
        id: { format: "uuid", type: "string" },
        isActive: { type: "boolean" },
        phone: { example: "+919876543210", type: "string" },
        referralCode: { example: "ABCD1234", type: "string" },
        totalBookings: { example: 7, type: "integer" },
        totalSpend: { example: "5460.00", type: "string" },
      },
      type: "object",
    },

    AdminPartner: {
      properties: {
        approvalDate: { format: "date-time", nullable: true, type: "string" },
        approvalRejectionReason: { nullable: true, type: "string" },
        approvalStatus: {
          enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"],
          type: "string",
        },
        bio: { nullable: true, type: "string" },
        createdAt: { format: "date-time", type: "string" },
        experienceYears: { nullable: true, type: "integer" },
        fullName: { nullable: true, type: "string" },
        id: { format: "uuid", type: "string" },
        isAvailable: { type: "boolean" },
        languages: { items: { type: "string" }, type: "array" },
        phone: { example: "+919876543210", type: "string" },
        profileImage: { nullable: true, type: "string" },
        rating: { example: 0, type: "number" },
        totalBookings: { example: 3, type: "integer" },
        updatedAt: { format: "date-time", type: "string" },
      },
      type: "object",
    },

    UpdateAdminConsumerRequest: {
      properties: {
        isActive: { type: "boolean" },
      },
      type: "object",
    },

    PartnerRejectionRequest: {
      properties: {
        reason: { maxLength: 500, type: "string" },
      },
      type: "object",
    },

    // ── Services ─────────────────────────────────────────────────────────────
    BreakdownItem: {
        properties: {
          amount: { example: 299, type: "number" },
          label: { example: "60 min", type: "string" },
        },
        type: "object",
      },

      EstimateRequest: {
        properties: {
          addonIds: {
            default: [],
            items: { format: "uuid", type: "string" },
            type: "array",
          },
          variantId: { format: "uuid", type: "string" },
        },
        required: ["variantId"],
        type: "object",
      },

      EstimateResponse: {
        properties: {
          addonsTotal: { example: 198, type: "number" },
          basePrice: { example: 299, type: "number" },
          breakdown: {
            items: { $ref: "#/components/schemas/BreakdownItem" },
            type: "array",
          },
          total: { example: 497, type: "number" },
        },
        type: "object",
      },

      LargeOfficeScope: {
        properties: {
          cleaningFrequency: {
            enum: ["ONE_TIME", "DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY", "CUSTOM"],
            type: "string",
          },
          employeeBand: {
            enum: ["100_200", "200_500", "500_PLUS"],
            type: "string",
          },
          floorsCount: { enum: [1, 2, 3, 4], type: "integer" },
          officeAreaSqFt: {
            enum: ["UNDER_5000", "5000_15000", "OVER_15000"],
            type: "string",
          },
          restroomBand: {
            enum: ["UNDER_10", "10_25", "26_50", "OVER_50"],
            type: "string",
          },
        },
        required: [
          "employeeBand",
          "officeAreaSqFt",
          "floorsCount",
          "restroomBand",
          "cleaningFrequency",
        ],
        type: "object",
      },

      LargeOfficeEstimateRequest: {
        properties: {
          scope: { $ref: "#/components/schemas/LargeOfficeScope" },
          variantId: { format: "uuid", type: "string" },
        },
        required: ["variantId", "scope"],
        type: "object",
      },

      LargeOfficeEstimateResponse: {
        properties: {
          basePrice: { example: 7999, type: "number" },
          computedBasePrice: { example: 9199, type: "number" },
          estimatedDurationMin: { example: 345, type: "integer" },
          estimatedTeam: { example: 5, type: "integer" },
          mappedTierLabel: { example: "51–100 Employees", type: "string" },
          uplifts: {
            items: {
              properties: {
                amount: { type: "number" },
                label: { type: "string" },
                percent: { type: "number" },
              },
              type: "object",
            },
            type: "array",
          },
        },
        type: "object",
      },

      QuotationRequestBody: {
        properties: {
          address: { maxLength: 500, type: "string" },
          name: { maxLength: 100, type: "string" },
          notes: { maxLength: 1000, type: "string" },
          phone: { example: "+919876543210", type: "string" },
          preferredTime: { format: "date-time", type: "string" },
          serviceId: { format: "uuid", type: "string" },
          variantId: { format: "uuid", type: "string" },
        },
        required: ["name", "phone", "address"],
        type: "object",
      },

      ServiceVariant: {
        properties: {
          basePrice: { example: "299.00", type: "string" },
          id: { format: "uuid", type: "string" },
          label: { example: "60 min", type: "string" },
          sortOrder: { type: "integer" },
          value: { example: "60", type: "string" },
        },
        type: "object",
      },

      ServiceAddon: {
        properties: {
          description: { nullable: true, type: "string" },
          id: { format: "uuid", type: "string" },
          name: { type: "string" },
          price: { example: "99.00", type: "string" },
          sortOrder: { type: "integer" },
        },
        type: "object",
      },

      ServiceInclusion: {
        properties: {
          description: { nullable: true, type: "string" },
          id: { format: "uuid", type: "string" },
          sortOrder: { type: "integer" },
          title: { type: "string" },
        },
        type: "object",
      },

      Service: {
        properties: {
          addons: { items: { $ref: "#/components/schemas/ServiceAddon" }, type: "array" },
          category: {
            enum: ["QUICK_SHINE", "DEEP_CLEANING", "DEEP_LUXE", "CORPORATE"],
            type: "string",
          },
          createdAt: { format: "date-time", type: "string" },
          description: { nullable: true, type: "string" },
          id: { format: "uuid", type: "string" },
          exclusions: { items: { $ref: "#/components/schemas/ServiceInclusion" }, type: "array" },
          inclusions: { items: { $ref: "#/components/schemas/ServiceInclusion" }, type: "array" },
          isActive: { type: "boolean" },
          name: { type: "string" },
          pricingModel: {
            enum: ["FIXED", "STARTING_AT", "INSPECTION"],
            type: "string",
          },
          sortOrder: { type: "integer" },
          tagline: { nullable: true, type: "string" },
          updatedAt: { format: "date-time", type: "string" },
          variants: { items: { $ref: "#/components/schemas/ServiceVariant" }, type: "array" },
        },
        type: "object",
      },

      ServiceDetail: { $ref: "#/components/schemas/Service" },

      // ── Admin service management ─────────────────────────────────────────

      VariantItem: {
        properties: {
          id: { format: "uuid", type: "string" },
          basePrice: { minimum: 0, type: "number" },
          label: { maxLength: 100, minLength: 1, type: "string" },
          sortOrder: { default: 0, minimum: 0, type: "integer" },
          value: { maxLength: 100, minLength: 1, type: "string" },
        },
        required: ["label", "value", "basePrice"],
        type: "object",
      },

      AddonItem: {
        properties: {
          id: { format: "uuid", type: "string" },
          description: { maxLength: 500, nullable: true, type: "string" },
          name: { maxLength: 100, minLength: 1, type: "string" },
          price: { minimum: 0, type: "number" },
          sortOrder: { default: 0, minimum: 0, type: "integer" },
        },
        required: ["name", "price"],
        type: "object",
      },

      InclusionItem: {
        properties: {
          id: { format: "uuid", type: "string" },
          description: { maxLength: 500, nullable: true, type: "string" },
          sortOrder: { default: 0, minimum: 0, type: "integer" },
          title: { maxLength: 200, minLength: 1, type: "string" },
        },
        required: ["title"],
        type: "object",
      },

      CreateServiceRequest: {
        properties: {
          addons: { default: [], items: { $ref: "#/components/schemas/AddonItem" }, type: "array" },
          category: {
            enum: ["QUICK_SHINE", "DEEP_CLEANING", "DEEP_LUXE", "CORPORATE"],
            type: "string",
          },
          description: { maxLength: 1000, type: "string" },
          inclusions: { default: [], items: { $ref: "#/components/schemas/InclusionItem" }, type: "array" },
          name: { maxLength: 100, minLength: 1, type: "string" },
          pricingModel: {
            default: "FIXED",
            enum: ["FIXED", "STARTING_AT", "INSPECTION"],
            type: "string",
          },
          sortOrder: { default: 0, minimum: 0, type: "integer" },
          tagline: { maxLength: 200, type: "string" },
          variants: { default: [], items: { $ref: "#/components/schemas/VariantItem" }, type: "array" },
        },
        required: ["category", "name"],
        type: "object",
      },

      UpdateServiceRequest: {
        properties: {
          addons: { items: { $ref: "#/components/schemas/AddonItem" }, type: "array" },
          category: { enum: ["QUICK_SHINE", "DEEP_CLEANING", "DEEP_LUXE", "CORPORATE"], type: "string" },
          description: { maxLength: 1000, type: "string" },
          inclusions: { items: { $ref: "#/components/schemas/InclusionItem" }, type: "array" },
          isActive: { type: "boolean" },
          name: { maxLength: 100, minLength: 1, type: "string" },
          pricingModel: { enum: ["FIXED", "STARTING_AT", "INSPECTION"], type: "string" },
          sortOrder: { minimum: 0, type: "integer" },
          tagline: { maxLength: 200, type: "string" },
          variants: { items: { $ref: "#/components/schemas/VariantItem" }, type: "array" },
        },
        type: "object",
      },

      // ── Bookings ────────────────────────────────────────────────────────
      CreateBookingRequest: {
        properties: {
          addonIds: {
            default: [],
            items: { format: "uuid", type: "string" },
            type: "array",
          },
          addressId: { format: "uuid", type: "string" },
          bookingType: {
            enum: ["INSTANT", "SCHEDULED"],
            type: "string",
          },
          consumerNotes: { maxLength: 1000, type: "string" },
          largeOfficeScope: { $ref: "#/components/schemas/LargeOfficeScope" },
          paymentMode: {
            enum: ["RAZORPAY", "CASH", "WALLET"],
            type: "string",
          },
          scheduledAt: {
            description: "Required when bookingType is SCHEDULED. ISO-8601.",
            format: "date-time",
            type: "string",
          },
          serviceId: { format: "uuid", type: "string" },
          subVariantId: {
            description:
              "Required only when the selected variant defines sub-options (subVariants). Omit otherwise.",
            format: "uuid",
            type: "string",
          },
          subscriptionPlan: {
            default: "ONE_TIME",
            enum: ["ONE_TIME", "DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY", "CUSTOM"],
            type: "string",
          },
          variantId: { format: "uuid", type: "string" },
        },
        required: ["bookingType", "serviceId", "variantId", "addressId"],
        type: "object",
      },

      BookingAddon: {
        properties: {
          addonId: { format: "uuid", nullable: true, type: "string" },
          id: { format: "uuid", type: "string" },
          name: { type: "string" },
          price: { example: "149.00", type: "string" },
          quantity: { type: "integer" },
        },
        type: "object",
      },

      BookingStatusHistoryItem: {
        properties: {
          actorId: { format: "uuid", nullable: true, type: "string" },
          actorType: {
            enum: ["CONSUMER", "PARTNER", "ADMIN"],
            nullable: true,
            type: "string",
          },
          createdAt: { format: "date-time", type: "string" },
          fromStatus: { nullable: true, type: "string" },
          id: { format: "uuid", type: "string" },
          metadata: { nullable: true, type: "object" },
          reason: { nullable: true, type: "string" },
          toStatus: { type: "string" },
        },
        type: "object",
      },

      Booking: {
        properties: {
          addonsTotal: { example: "149.00", type: "string" },
          addressId: { format: "uuid", type: "string" },
          addressSnapshot: { type: "string" },
          basePrice: { example: "349.00", type: "string" },
          bookingNumber: { example: "BK-260516-0001", type: "string" },
          bookingType: { enum: ["INSTANT", "SCHEDULED"], type: "string" },
          cancellationReason: { nullable: true, type: "string" },
          cancelledAt: { format: "date-time", nullable: true, type: "string" },
          consumerId: { format: "uuid", type: "string" },
          consumerName: { type: "string" },
          consumerPhone: { type: "string" },
          createdAt: { format: "date-time", type: "string" },
          discountAmount: { example: "0.00", type: "string" },
          estimatedDurationMin: { type: "integer" },
          id: { format: "uuid", type: "string" },
          partnerId: { format: "uuid", nullable: true, type: "string" },
          paymentMode: { nullable: true, type: "string" },
          paymentStatus: {
            enum: [
              "PENDING",
              "AUTHORIZED",
              "CAPTURED",
              "FAILED",
              "CANCELLED",
              "PARTIALLY_REFUNDED",
              "REFUNDED",
            ],
            type: "string",
          },
          platformFee: { example: "0.00", type: "string" },
          scheduledAt: { format: "date-time", nullable: true, type: "string" },
          scheduledEndAt: {
            format: "date-time",
            nullable: true,
            type: "string",
          },
          serviceId: { format: "uuid", type: "string" },
          serviceName: { type: "string" },
          status: {
            enum: [
              "PENDING",
              "PAYMENT_PENDING",
              "CONFIRMED",
              "PROFESSIONAL_ASSIGNED",
              "PROFESSIONAL_EN_ROUTE",
              "CHECKED_IN",
              "IN_PROGRESS",
              "COMPLETED",
              "CANCELLED",
              "REFUNDED",
              "NO_SHOW",
            ],
            type: "string",
          },
          subscriptionPlan: {
            enum: ["ONE_TIME", "DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY", "CUSTOM"],
            type: "string",
          },
          subtotal: { example: "498.00", type: "string" },
          surgeAmount: { example: "0.00", type: "string" },
          surgeMultiplier: { example: "1.00", type: "string" },
          taxAmount: { example: "0.00", type: "string" },
          totalAmount: { example: "498.00", type: "string" },
          variantId: { format: "uuid", type: "string" },
          variantLabel: { type: "string" },
        },
        type: "object",
      },

      BookingReviewStatus: {
        properties: {
          canSubmitReview: {
            description:
              "True when the consumer can still submit a review for this booking",
            example: false,
            type: "boolean",
          },
          hasReview: {
            description: "True when a review has already been submitted",
            example: true,
            type: "boolean",
          },
          review: {
            nullable: true,
            properties: {
              createdAt: { format: "date-time", type: "string" },
              id: { format: "uuid", type: "string" },
              rating: { maximum: 5, minimum: 1, type: "integer" },
              review: { nullable: true, type: "string" },
            },
            type: "object",
          },
        },
        required: ["hasReview", "canSubmitReview"],
        type: "object",
      },

      BookingDisputeStatus: {
        properties: {
          canRaiseDispute: {
            description:
              "True when the user can still raise a dispute for this booking",
            example: false,
            type: "boolean",
          },
          dispute: {
            nullable: true,
            properties: {
              category: {
                enum: [
                  "SERVICE_QUALITY",
                  "PRICING",
                  "DAMAGE",
                  "NO_SHOW",
                  "OTHER",
                ],
                type: "string",
              },
              createdAt: { format: "date-time", type: "string" },
              description: { type: "string" },
              id: { format: "uuid", type: "string" },
              resolutionNotes: { nullable: true, type: "string" },
              resolvedAt: { format: "date-time", nullable: true, type: "string" },
              status: {
                enum: ["OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"],
                type: "string",
              },
            },
            type: "object",
          },
          hasActiveDispute: {
            description:
              "True when an OPEN or UNDER_REVIEW dispute exists for this user",
            example: true,
            type: "boolean",
          },
        },
        required: ["hasActiveDispute", "canRaiseDispute"],
        type: "object",
      },

      BookingDetail: {
        allOf: [
          { $ref: "#/components/schemas/Booking" },
          {
            properties: {
              addons: {
                items: { $ref: "#/components/schemas/BookingAddon" },
                type: "array",
              },
              disputeStatus: { $ref: "#/components/schemas/BookingDisputeStatus" },
              history: {
                items: { $ref: "#/components/schemas/BookingStatusHistoryItem" },
                type: "array",
              },
              reviewStatus: { $ref: "#/components/schemas/BookingReviewStatus" },
            },
            type: "object",
          },
        ],
      },

      // ── Pricing engine ───────────────────────────────────────────────────
      PreviewBookingRequest: {
        properties: {
          addonIds: {
            default: [],
            items: { format: "uuid", type: "string" },
            type: "array",
          },
          addressId: { format: "uuid", type: "string" },
          bookingType: { enum: ["INSTANT", "SCHEDULED"], type: "string" },
          couponCode: { type: "string" },
          largeOfficeScope: { $ref: "#/components/schemas/LargeOfficeScope" },
          scheduledAt: { format: "date-time", type: "string" },
          serviceId: { format: "uuid", type: "string" },
          subVariantId: {
            description:
              "Required only when the selected variant defines sub-options (subVariants). Omit otherwise.",
            format: "uuid",
            type: "string",
          },
          subscriptionPlan: {
            default: "ONE_TIME",
            enum: ["ONE_TIME", "DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY", "CUSTOM"],
            type: "string",
          },
          variantId: { format: "uuid", type: "string" },
        },
        required: ["bookingType", "serviceId", "variantId", "addressId"],
        type: "object",
      },

      CheckAvailabilityRequest: {
        properties: {
          addressId: {
            description: "Saved consumer address. Provide this or latitude/longitude.",
            format: "uuid",
            type: "string",
          },
          latitude: { maximum: 90, minimum: -90, type: "number" },
          longitude: { maximum: 180, minimum: -180, type: "number" },
          scheduledAt: {
            description: "Consumer-selected slot (ISO-8601).",
            format: "date-time",
            type: "string",
          },
          serviceId: { format: "uuid", type: "string" },
          variantId: {
            description: "Optional — used to estimate service duration.",
            format: "uuid",
            type: "string",
          },
        },
        required: ["serviceId", "scheduledAt"],
        type: "object",
      },

      AvailabilitySlotItem: {
        properties: {
          available: { type: "boolean" },
          endAt: { format: "date-time", type: "string" },
          label: { example: "6 PM", type: "string" },
          startAt: { format: "date-time", type: "string" },
        },
        required: ["startAt", "endAt", "label", "available"],
        type: "object",
      },

      CheckAvailabilityResponse: {
        oneOf: [
          {
            properties: {
              distanceMeters: { type: "integer" },
              matched: { enum: [true], type: "boolean" },
              partnerId: { format: "uuid", type: "string" },
              scheduledAt: { format: "date-time", type: "string" },
              scheduledEndAt: { format: "date-time", type: "string" },
            },
            required: [
              "matched",
              "partnerId",
              "distanceMeters",
              "scheduledAt",
              "scheduledEndAt",
            ],
            type: "object",
          },
          {
            properties: {
              alternatives: {
                properties: {
                  date: { format: "date", type: "string" },
                  periods: {
                    items: {
                      properties: {
                        period: {
                          enum: ["MORNING", "AFTERNOON", "EVENING"],
                          type: "string",
                        },
                        slots: {
                          items: { $ref: "#/components/schemas/AvailabilitySlotItem" },
                          type: "array",
                        },
                      },
                      type: "object",
                    },
                    type: "array",
                  },
                },
                type: "object",
              },
              matched: { enum: [false], type: "boolean" },
              nearestPartner: {
                nullable: true,
                properties: {
                  distanceMeters: { type: "integer" },
                  partnerId: { format: "uuid", type: "string" },
                },
                type: "object",
              },
              reason: {
                enum: [
                  "NO_AVAILABLE_SLOT",
                  "NO_PARTNER_IN_AREA",
                  "NOT_SERVICEABLE",
                ],
                type: "string",
              },
              requestedAt: { format: "date-time", type: "string" },
            },
            required: ["matched", "reason", "requestedAt", "alternatives"],
            type: "object",
          },
        ],
      },

      PricingLineItem: {
        properties: {
          amount: { example: 349, type: "number" },
          label: { example: "60 min", type: "string" },
          type: {
            enum: ["base", "addon", "discount", "tax", "fee"],
            type: "string",
          },
        },
        type: "object",
      },

      PricingBreakdown: {
        properties: {
          addonsTotal: { type: "number" },
          basePrice: { type: "number" },
          couponCode: { nullable: true, type: "string" },
          couponDiscount: { type: "number" },
          discountAmount: { type: "number" },
          lineItems: {
            items: { $ref: "#/components/schemas/PricingLineItem" },
            type: "array",
          },
          platformFee: { type: "number" },
          subscriptionDiscount: { type: "number" },
          subtotal: { type: "number" },
          surgeAmount: { type: "number" },
          surgeMultiplier: { type: "number" },
          taxableAmount: { type: "number" },
          taxAmount: { type: "number" },
          totalAmount: { type: "number" },
        },
        type: "object",
      },

      BookingPreview: {
        properties: {
          breakdown: { $ref: "#/components/schemas/PricingBreakdown" },
          estimatedDurationMin: { type: "integer" },
          scheduledAt: { format: "date-time", type: "string" },
        },
        type: "object",
      },

      CouponOffer: {
        properties: {
          applicableCategories: {
            items: {
              enum: ["QUICK_SHINE", "DEEP_CLEANING", "DEEP_LUXE", "CORPORATE"],
              type: "string",
            },
            type: "array",
          },
          code: { example: "FRESHSTART", type: "string" },
          ctaText: { example: "Book Now", type: "string" },
          discountType: { enum: ["PERCENTAGE", "FLAT"], type: "string" },
          discountValue: { example: 30, type: "number" },
          id: { format: "uuid", type: "string" },
          label: { example: "LIMITED OFFER", nullable: true, type: "string" },
          maxDiscountAmount: { nullable: true, type: "number" },
          minOrderAmount: { example: 299, type: "number" },
          subtitle: {
            example: "Use code FRESHSTART at checkout",
            type: "string",
          },
          title: { example: "Get 30% Off Deep Cleaning", type: "string" },
          validUntil: { format: "date-time", nullable: true, type: "string" },
        },
        required: [
          "id",
          "code",
          "title",
          "subtitle",
          "discountType",
          "discountValue",
          "ctaText",
        ],
        type: "object",
      },

      CouponValidateResponse: {
        properties: {
          code: { example: "FLAT100", type: "string" },
          coupon: {
            properties: {
              code: { type: "string" },
              couponId: { format: "uuid", type: "string" },
              description: { nullable: true, type: "string" },
              discount: { type: "number" },
              validatedAmount: { type: "number" },
            },
            type: "object",
          },
          couponId: { format: "uuid", type: "string" },
          description: { nullable: true, type: "string" },
          discount: { example: 100, type: "number" },
          valid: { example: true, type: "boolean" },
          validatedAmount: {
            description: "Pre-coupon subtotal used for eligibility checks",
            type: "number",
          },
        },
        required: ["valid", "code", "discount", "couponId"],
        type: "object",
      },

      CreateCouponRequest: {
        properties: {
          applicableCategories: {
            default: [],
            items: {
              enum: ["QUICK_SHINE", "DEEP_CLEANING", "DEEP_LUXE", "CORPORATE"],
              type: "string",
            },
            type: "array",
          },
          applicableServiceIds: {
            default: [],
            items: { format: "uuid", type: "string" },
            type: "array",
          },
          code: { example: "WELCOME50", type: "string" },
          description: { type: "string" },
          discountType: { enum: ["PERCENTAGE", "FLAT"], type: "string" },
          discountValue: { example: 50, type: "number" },
          firstBookingOnly: { default: false, type: "boolean" },
          maxDiscountAmount: { type: "number" },
          minOrderAmount: { default: 0, type: "number" },
          perUserLimit: { type: "integer" },
          usageLimit: { type: "integer" },
          validFrom: { format: "date-time", type: "string" },
          validUntil: { format: "date-time", type: "string" },
        },
        required: ["code", "discountType", "discountValue"],
        type: "object",
      },

      // ── Slots ────────────────────────────────────────────────────────────
      GenerateSlotsRequest: {
        properties: {
          capacity: { default: 5, type: "integer" },
          endHour: { default: 20, maximum: 24, minimum: 1, type: "integer" },
          fromDate: { format: "date", type: "string" },
          serviceId: { format: "uuid", type: "string" },
          slotDurationMin: { default: 60, type: "integer" },
          startHour: { default: 8, maximum: 23, minimum: 0, type: "integer" },
          toDate: { format: "date", type: "string" },
        },
        required: ["serviceId", "fromDate", "toDate"],
        type: "object",
      },

      TimeSlot: {
        properties: {
          capacity: { type: "integer" },
          endAt: { format: "date-time", type: "string" },
          id: { format: "uuid", type: "string" },
          isActive: { type: "boolean" },
          reservedCount: { type: "integer" },
          serviceId: { format: "uuid", type: "string" },
          startAt: { format: "date-time", type: "string" },
        },
        type: "object",
      },

      // ── Payments ─────────────────────────────────────────────────────────
      Payment: {
        properties: {
          amount: { example: "498.00", type: "string" },
          bookingId: { format: "uuid", type: "string" },
          capturedAt: { format: "date-time", nullable: true, type: "string" },
          currency: { example: "INR", type: "string" },
          failureReason: { nullable: true, type: "string" },
          id: { format: "uuid", type: "string" },
          provider: { example: "RAZORPAY", type: "string" },
          razorpayOrderId: { nullable: true, type: "string" },
          razorpayPaymentId: { nullable: true, type: "string" },
          status: {
            enum: [
              "PENDING",
              "AUTHORIZED",
              "CAPTURED",
              "FAILED",
              "CANCELLED",
              "PARTIALLY_REFUNDED",
              "REFUNDED",
            ],
            type: "string",
          },
        },
        type: "object",
      },

    },
    securitySchemes: {
      bearerAuth: {
        bearerFormat: "JWT",
        scheme: "bearer",
        type: "http",
      },
    },
  };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesGlob = path.resolve(__dirname, "../api/v1/**/routes.{ts,js}");

const options: swaggerJSDoc.OAS3Options = {
  apis: [routesGlob],
  definition: {
    components: swaggerComponents,
    info: {
      description:
        "Clenzey is a tech-enabled home services platform for booking cleaning services with transparent pricing and verified partners.",
      title: "Clenzey API",
      version: "1.0.0",
    },
    openapi: "3.0.0",
    servers: [
      { description: "Local development", url: `http://localhost:${envConfig.PORT}/api/v1` },
      { description: "Production", url: "https://api.clenzey.com/api/v1" },
    ],
    tags: [
      { description: "Consumer OTP authentication", name: "consumer-auth" },
      { description: "Consumer profile management", name: "consumer-profile" },
      { description: "Partner OTP authentication", name: "partner-auth" },
      { description: "Admin OTP authentication (whitelist-only)", name: "admin-auth" },
      { description: "Admin network management (consumers, partners)", name: "admin-network" },
      { description: "Service catalogue and pricing", name: "services" },
      { description: "Admin service catalogue management", name: "admin-services" },
      { description: "Site visit and quotation requests", name: "quotations" },
      { description: "Booking lifecycle (create, view, transition, cancel)", name: "bookings" },
      { description: "Coupons (admin CRUD + consumer validate)", name: "coupons" },
      { description: "Time slots: list available, admin generate", name: "slots" },
      { description: "Partner availability and live location", name: "partner-availability" },
      { description: "Razorpay payments (orders, confirm, webhook)", name: "payments" },
      { description: "Saved consumer addresses (CRUD + default)", name: "addresses" },
      { description: "Reverse geocoding, place search, serviceability checks", name: "location" },
      { description: "Admin geofence / serviceable polygon management", name: "zones" },
    ],
  },
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerSpec, swaggerUi };
