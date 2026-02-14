export interface MessagePayload {
  id: string;
  channelId: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  content: string;
  attachments: AttachmentPayload[];
  embeds: EmbedPayload[];
  replyToId: string | null;
  replyTo: MessagePayload | null;
  editedAt: string | null;
  pinned: boolean;
  reactions: ReactionGroup[];
  createdAt: string;
  linkPreview: LinkPreviewPayload | null;
}

export interface LinkPreviewPayload {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

export interface AttachmentPayload {
  id: string;
  filename: string;
  url: string;
  contentType: string;
  size: number;
}

export interface EmbedPayload {
  type: 'link';
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: string[];
}
