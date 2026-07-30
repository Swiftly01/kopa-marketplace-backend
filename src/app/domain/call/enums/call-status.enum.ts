export enum CallStatus {
  INITIATED = 'initiated', // Caller sent call:initiate, callee not yet notified

  RINGING = 'ringing', // Callee's socket received call:incoming

  ACTIVE = 'active', // Both peers exchanged SDP and ICE, call is live

  ENDED = 'ended', // Either party hung up normally

  DECLINED = 'declined', // Callee sent call:decline

  MISSED = 'missed', // Caller sent call:cancel after no answer

  CANCELLED = 'cancelled', // Caller canceled before callee answered

  FAILED = 'failed', // Technical failure during signalling/ICE
}
