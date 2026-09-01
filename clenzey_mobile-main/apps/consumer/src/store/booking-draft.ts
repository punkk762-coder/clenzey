import { create } from 'zustand';

export interface BookingDraft {
  serviceId: string;
  variantId: string;
  subVariantId?: string;
  addonIds: string[];
  bookingType: 'INSTANT' | 'SCHEDULED';
  scheduledAt?: string;
  couponCode?: string;
}

interface BookingDraftState {
  draft: BookingDraft | null;
  setDraft: (draft: BookingDraft) => void;
  clearDraft: () => void;
}

export const useBookingDraftStore = create<BookingDraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
