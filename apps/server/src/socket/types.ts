import type { Socket } from 'socket.io';
import type { MessagePayload, AttachmentPayload, EmbedPayload, ReactionGroup, LinkPreviewPayload } from '@btow/shared';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  activeChannel?: string;
  voiceChannelId?: string;
}

// Re-export shared types for backward compatibility
export type { MessagePayload, AttachmentPayload, EmbedPayload, ReactionGroup, LinkPreviewPayload };
