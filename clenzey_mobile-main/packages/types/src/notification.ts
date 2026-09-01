export interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  type: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
