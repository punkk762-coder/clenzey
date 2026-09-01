import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { SocketManager } from '@clenzey/socket-client';
import type { PartnerProposedEvent } from '@clenzey/socket-client';

/**
 * Listens for `booking:partner_proposed` Socket.IO events and:
 * - Shows an in-app Alert notification with booking summary
 * - Invalidates the assignments query to refresh the list
 * - Provides navigation to the assignment detail screen
 *
 * Requirements: 22.1, 22.3, 22.4
 *
 * @param socketManager - The connected SocketManager instance (or null if not connected)
 */
export function useAssignmentNotifications(socketManager: SocketManager | null): void {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Use refs to keep router and queryClient stable across re-renders
  const routerRef = useRef(router);
  routerRef.current = router;

  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (!socketManager) return;

    const handler = (data: PartnerProposedEvent) => {
      // Invalidate assignments queries to refresh the list
      queryClientRef.current.invalidateQueries({ queryKey: ['assignments'] });

      // Show in-app alert notification
      Alert.alert(
        'New Assignment',
        'You have a new booking assignment!',
        [
          {
            text: 'View',
            onPress: () => {
              routerRef.current.push(`/assignments/${data.assignmentId}`);
            },
          },
          {
            text: 'Later',
            style: 'cancel',
          },
        ],
      );
    };

    socketManager.on('booking:partner_proposed', handler);

    return () => {
      socketManager.off('booking:partner_proposed', handler);
    };
  }, [socketManager]);
}
