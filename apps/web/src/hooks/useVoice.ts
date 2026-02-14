import { useEffect, useRef, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  ParticipantEvent,
  ConnectionState,
  createLocalAudioTrack,
} from 'livekit-client';
import { getSocket, useSocketEvent } from './useSocket';
import { useVoiceStore, type VoiceParticipant } from '../stores/voiceStore';
import { useAuthStore } from '../stores/authStore';

export function useVoice() {
  const roomRef = useRef<Room | null>(null);
  const store = useVoiceStore();
  const { user } = useAuthStore();

  // ─── Handle incoming socket token response ────────────────────────────────
  useSocketEvent<{ token: string; livekitUrl: string; channelId: string }>(
    'voice:token',
    async ({ token, livekitUrl }) => {
      // Disconnect from any existing room first
      if (roomRef.current) {
        await roomRef.current.disconnect();
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true },
      });

      roomRef.current = room;

      // ─── Room events ──────────────────────────────────────────────────────
      room.on(RoomEvent.Connected, () => {
        store.setConnected(true);

        // Add existing participants
        room.remoteParticipants.forEach((p) => {
          store.addParticipant(participantToRecord(p));
        });

        // Add local participant
        if (room.localParticipant && user) {
          store.addParticipant({
            userId: room.localParticipant.identity,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            isMuted: room.localParticipant.isMicrophoneEnabled === false,
            isDeafened: false,
            isSpeaking: false,
          });
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        store.disconnect();
        roomRef.current = null;
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (state === ConnectionState.Connecting) store.setConnecting(true);
        if (state === ConnectionState.Disconnected) store.setConnected(false);
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        store.addParticipant(participantToRecord(participant));
        subscribeToSpeaking(participant);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        store.removeParticipant(participant.identity);
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const speakingIds = new Set(speakers.map((s) => s.identity));
        store.participants.forEach((_, userId) => {
          store.setSpeaking(userId, speakingIds.has(userId));
        });
      });

      // ─── Connect ──────────────────────────────────────────────────────────
      try {
        await room.connect(livekitUrl, token);

        // Publish microphone
        const audioTrack = await createLocalAudioTrack({
          echoCancellation: true,
          noiseSuppression: true,
        });
        await room.localParticipant.publishTrack(audioTrack);
      } catch (err) {
        console.error('[Voice] Connection failed:', err);
        store.setConnecting(false);
      }
    }
  );

  useSocketEvent<{ message: string }>('voice:error', ({ message }) => {
    console.error('[Voice] Server error:', message);
    store.setConnecting(false);
  });

  // ─── Actions ──────────────────────────────────────────────────────────────
  const joinChannel = useCallback(
    (channelId: string, serverId: string) => {
      const socket = getSocket();
      if (!socket) return;
      store.setConnecting(true);
      // Server will verify membership and emit voice:token back
      socket.emit('voice:join', { channelId });
      // Optimistically set channel context so the HUD appears
      useVoiceStore.setState({ channelId, serverId });
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const leaveChannel = useCallback(async () => {
    const socket = getSocket();
    const { channelId } = useVoiceStore.getState();
    if (channelId && socket) {
      socket.emit('voice:leave', { channelId });
    }
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    store.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const { isMuted, channelId } = useVoiceStore.getState();
    const newMuted = !isMuted;

    await room.localParticipant.setMicrophoneEnabled(!newMuted);
    store.setMuted(newMuted);

    const socket = getSocket();
    if (socket && channelId) {
      socket.emit('voice:mute', { channelId, muted: newMuted });
    }
    store.updateParticipant(room.localParticipant.identity, { isMuted: newMuted });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDeafen = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const { isDeafened, channelId } = useVoiceStore.getState();
    const newDeafened = !isDeafened;

    // Deafen = disable all remote audio
    room.remoteParticipants.forEach((p) => {
      p.audioTrackPublications.forEach((pub) => {
        if (pub.track) pub.track.mediaStreamTrack.enabled = !newDeafened;
      });
    });

    store.setDeafened(newDeafened);
    const socket = getSocket();
    if (socket && channelId) {
      socket.emit('voice:deafen', { channelId, deafened: newDeafened });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  return {
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    ...store,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function participantToRecord(p: RemoteParticipant): VoiceParticipant {
  return {
    userId: p.identity,
    username: p.name ?? p.identity,
    displayName: p.name ?? p.identity,
    avatarUrl: null,
    isMuted: p.isMicrophoneEnabled === false,
    isDeafened: false,
    isSpeaking: p.isSpeaking,
  };
}

function subscribeToSpeaking(participant: RemoteParticipant) {
  participant.on(ParticipantEvent.IsSpeakingChanged, (speaking: boolean) => {
    useVoiceStore.getState().setSpeaking(participant.identity, speaking);
  });

  participant.on(ParticipantEvent.TrackMuted, (pub) => {
    if (pub.kind === Track.Kind.Audio) {
      useVoiceStore.getState().updateParticipant(participant.identity, { isMuted: true });
    }
  });

  participant.on(ParticipantEvent.TrackUnmuted, (pub) => {
    if (pub.kind === Track.Kind.Audio) {
      useVoiceStore.getState().updateParticipant(participant.identity, { isMuted: false });
    }
  });
}
