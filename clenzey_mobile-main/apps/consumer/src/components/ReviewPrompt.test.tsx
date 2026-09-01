import React from 'react';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockCreate = jest.fn();
jest.mock('../lib/api', () => ({
  reviewsApi: {
    create: (...args: any[]) => mockCreate(...args),
  },
}));

jest.mock('./AppScrollDialog', () => ({
  AppScrollDialog: ({ visible, children, title, subtitle }: any) => {
    if (!visible) return null;
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      subtitle ? React.createElement(Text, null, subtitle) : null,
      children,
    );
  },
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Pressable = RN.TouchableOpacity || ((props: any) => {
    const React = require('react');
    return React.createElement('View', props);
  });
  return RN;
});

import { ReviewPromptModal } from './ReviewPrompt';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderWithWrapper(ui: React.ReactElement): ReactTestRenderer {
  const Wrapper = createWrapper();
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<Wrapper>{ui}</Wrapper>);
  });
  return renderer;
}

function findAllByAccessibilityLabel(renderer: ReactTestRenderer, label: string) {
  return renderer.root.findAll(
    (node: any) => node.props.accessibilityLabel === label,
  );
}

function findOneByAccessibilityLabel(renderer: ReactTestRenderer, label: string) {
  const matches = findAllByAccessibilityLabel(renderer, label);
  return matches[0];
}

function findByTextContent(renderer: ReactTestRenderer, text: string) {
  return renderer.root.findAll((node: any) => {
    if (!node.children || node.children.length === 0) return false;
    const fullText = node.children
      .filter((c: any) => typeof c === 'string')
      .join('');
    return fullText === text;
  });
}

describe('ReviewPromptModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockCreate.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders star rating selector with 5 stars', () => {
    const renderer = renderWithWrapper(
      <ReviewPromptModal visible onDismiss={jest.fn()} bookingId="booking-123" />,
    );
    for (let star = 1; star <= 5; star++) {
      const label = `Rate ${star} star${star > 1 ? 's' : ''}`;
      const matches = findAllByAccessibilityLabel(renderer, label);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('renders submit button disabled initially (no rating selected)', () => {
    const renderer = renderWithWrapper(
      <ReviewPromptModal visible onDismiss={jest.fn()} bookingId="booking-123" />,
    );
    const submitButton = findOneByAccessibilityLabel(renderer, 'Submit Review');
    expect(submitButton).toBeDefined();
    expect(submitButton.props.disabled).toBe(true);
  });

  it('enables submit button after selecting a star rating', () => {
    const renderer = renderWithWrapper(
      <ReviewPromptModal visible onDismiss={jest.fn()} bookingId="booking-123" />,
    );
    const star3 = findOneByAccessibilityLabel(renderer, 'Rate 3 stars');
    act(() => {
      star3.props.onPress();
    });
    const submitButton = findOneByAccessibilityLabel(renderer, 'Submit Review');
    expect(submitButton.props.disabled).toBe(false);
  });

  it('calls POST /reviews with bookingId, rating, and review on submit', async () => {
    mockCreate.mockResolvedValue({ data: { id: 'rev-1', rating: 4, bookingId: 'booking-123' } });
    const onDismiss = jest.fn();
    const renderer = renderWithWrapper(
      <ReviewPromptModal visible onDismiss={onDismiss} bookingId="booking-123" />,
    );

    const star4 = findOneByAccessibilityLabel(renderer, 'Rate 4 stars');
    act(() => {
      star4.props.onPress();
    });

    const textInputs = findAllByAccessibilityLabel(renderer, 'Review text');
    const textInput = textInputs.find((n: any) => n.props.onChangeText);
    act(() => {
      textInput!.props.onChangeText('Great service!');
    });

    const submitButton = findOneByAccessibilityLabel(renderer, 'Submit Review');
    await act(async () => {
      submitButton.props.onPress();
      await Promise.resolve();
      jest.runAllTimers();
    });

    expect(mockCreate).toHaveBeenCalledWith({
      bookingId: 'booking-123',
      rating: 4,
      review: 'Great service!',
    });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders title and subtitle text', () => {
    const renderer = renderWithWrapper(
      <ReviewPromptModal visible onDismiss={jest.fn()} bookingId="booking-123" />,
    );
    const title = findByTextContent(renderer, 'Rate this service');
    const subtitle = findByTextContent(renderer, 'How was your experience? Tap a star to rate.');
    expect(title.length).toBeGreaterThanOrEqual(1);
    expect(subtitle.length).toBeGreaterThanOrEqual(1);
  });
});
