import { createClient } from '@liveblocks/client';
import { createRoomContext } from '@liveblocks/react';

const client = createClient({
  authEndpoint: '/api/liveblocks-auth',
  throttle: 16,
});

// Presence type for collaborative editing
type Presence = {
  cursor: { x: number; y: number } | null;
  selection: string | null;
  user: {
    name: string;
    color: string;
  };
};

// Storage type for document content
type Storage = {
  document: any; // BlockNote document content
};

// User meta type
type UserMeta = {
  id: string;
  info: {
    name: string;
    email: string;
    color: string;
  };
};

// Room event types
type RoomEvent = {
  type: 'SAVE_DOCUMENT';
  document: any;
};

export const {
  suspense: {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useStorage,
    useMutation,
    useOthers,
    useBroadcastEvent,
    useEventListener,
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);
