import { Socket } from 'socket.io';
import { User } from '../../users/entities/user.entity';

export interface ClientToServerEvents {
  send_message: (data: { text: string }) => void;
}

export interface ServerToClientEvents {
  new_message: (data: { text: string; userId: string }) => void;
  user_status_changed: (data: { userId: string; status: string }) => void;
  user_typing: (data: {
    conversationId: string;
    userId: string;
    userName: string;
  }) => void;
  user_stopped_typing: (data: {
    conversationId: string;
    userId: string;
  }) => void;
  call_peer_joined: (data: { callId: string; userId: string }) => void;
  call_offer: (data: { callId: string; sdpType: string; sdp: string }) => void;
  call_answer: (data: { callId: string; sdpType: string; sdp: string }) => void;
  call_ice_candidate: (data: {
    callId: string;
    candidate: string;
    sdpMid?: string;
    sdpMLineIndex?: number;
  }) => void;
  call_error: (data: { message: string }) => void;
  error: (data: { message: string }) => void;
}

export type InterServerEvents = Record<string, never>;

export interface SocketData {
  userId: string;
  user: User;
  callId?: string;
  callerId?: string;
  calleeId?: string;
}

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
