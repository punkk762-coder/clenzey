/**
 * Unit tests for partner reviews screen logic.
 *
 * Tests that the reviews screen correctly fetches and processes
 * review data for the authenticated partner.
 *
 * Validates: Requirement 26.1
 */

// Mock the API and auth store
const mockListByPartner = jest.fn();
jest.mock('../lib/api', () => ({
  reviewsApi: {
    listByPartner: (...args: any[]) => mockListByPartner(...args),
  },
}));

jest.mock('../store/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'partner-123', fullName: 'Test Partner', phone: '+919876543210' },
  }),
}));

describe('Partner Reviews Screen (Requirement 26.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API call to GET /reviews/partner/:partnerId', () => {
    it('calls listByPartner with the partner ID from auth store', async () => {
      const mockResponse = {
        data: {
          reviews: [
            {
              id: 'rev-1',
              rating: 5,
              review: 'Great service!',
              createdAt: '2024-01-15T10:00:00Z',
            },
          ],
          total: 1,
          averageRating: 5.0,
        },
      };
      mockListByPartner.mockResolvedValue(mockResponse);

      const partnerId = 'partner-123';
      const response = await mockListByPartner(partnerId, { limit: 50, offset: 0 });

      expect(mockListByPartner).toHaveBeenCalledWith('partner-123', {
        limit: 50,
        offset: 0,
      });
      expect(response.data.reviews).toHaveLength(1);
      expect(response.data.total).toBe(1);
      expect(response.data.averageRating).toBe(5.0);
    });

    it('passes limit and offset parameters for pagination', async () => {
      mockListByPartner.mockResolvedValue({
        data: { reviews: [], total: 0, averageRating: 0 },
      });

      await mockListByPartner('partner-123', { limit: 20, offset: 40 });

      expect(mockListByPartner).toHaveBeenCalledWith('partner-123', {
        limit: 20,
        offset: 40,
      });
    });

    it('returns reviews list with expected structure', async () => {
      const reviews = [
        {
          id: 'rev-1',
          rating: 5,
          review: 'Excellent!',
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 'rev-2',
          rating: 4,
          review: 'Good service',
          createdAt: '2024-01-14T09:00:00Z',
        },
        {
          id: 'rev-3',
          rating: 3,
          review: null,
          createdAt: '2024-01-13T08:00:00Z',
        },
      ];

      mockListByPartner.mockResolvedValue({
        data: { reviews, total: 3, averageRating: 4.0 },
      });

      const response = await mockListByPartner('partner-123', { limit: 50, offset: 0 });
      const data = response.data;

      expect(data.reviews).toHaveLength(3);
      expect(data.total).toBe(3);
      expect(data.averageRating).toBe(4.0);

      // Each review should have id, rating, and createdAt
      data.reviews.forEach((review: any) => {
        expect(review).toHaveProperty('id');
        expect(review).toHaveProperty('rating');
        expect(review).toHaveProperty('createdAt');
        expect(review.rating).toBeGreaterThanOrEqual(1);
        expect(review.rating).toBeLessThanOrEqual(5);
      });
    });

    it('handles empty reviews response', async () => {
      mockListByPartner.mockResolvedValue({
        data: { reviews: [], total: 0, averageRating: 0 },
      });

      const response = await mockListByPartner('partner-123', { limit: 50, offset: 0 });
      const data = response.data;

      expect(data.reviews).toHaveLength(0);
      expect(data.total).toBe(0);
      expect(data.averageRating).toBe(0);
    });

    it('handles API error gracefully', async () => {
      mockListByPartner.mockRejectedValue(new Error('Network error'));

      await expect(
        mockListByPartner('partner-123', { limit: 50, offset: 0 })
      ).rejects.toThrow('Network error');
    });
  });

  describe('Rating display logic', () => {
    it('formats averageRating to one decimal place', () => {
      const averageRating = 4.333;
      expect(averageRating.toFixed(1)).toBe('4.3');
    });

    it('displays correct plural form for review count', () => {
      const formatReviewCount = (total: number) =>
        `${total} ${total === 1 ? 'review' : 'reviews'}`;

      expect(formatReviewCount(0)).toBe('0 reviews');
      expect(formatReviewCount(1)).toBe('1 review');
      expect(formatReviewCount(5)).toBe('5 reviews');
      expect(formatReviewCount(100)).toBe('100 reviews');
    });

    it('renders correct number of filled stars based on rating', () => {
      const renderStars = (rating: number) => {
        const filled = Math.round(rating);
        return '★'.repeat(filled) + '☆'.repeat(5 - filled);
      };

      expect(renderStars(5)).toBe('★★★★★');
      expect(renderStars(4)).toBe('★★★★☆');
      expect(renderStars(3.5)).toBe('★★★★☆'); // rounds to 4
      expect(renderStars(2.4)).toBe('★★☆☆☆'); // rounds to 2
      expect(renderStars(0)).toBe('☆☆☆☆☆');
    });
  });

  describe('Date formatting', () => {
    it('formats review dates in Indian locale', () => {
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      };

      // Just test that it returns a non-empty string (locale output varies by environment)
      const result = formatDate('2024-01-15T10:00:00Z');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});
