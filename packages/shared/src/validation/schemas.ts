import { z } from 'zod';

// User schemas
export const UsernameSchema = z.string().min(2).max(32).regex(/^[a-zA-Z0-9_]+$/);
export const DisplayNameSchema = z.string().min(1).max(32);
export const EmailSchema = z.string().email();
export const PasswordSchema = z.string().min(8).max(128);
export const StatusSchema = z.enum(['online', 'idle', 'dnd', 'offline']);

// Server schemas
export const ServerNameSchema = z.string().min(1).max(100);
export const ServerDescriptionSchema = z.string().max(1000).nullable();

// Channel schemas
export const ChannelNameSchema = z.string().min(1).max(100);
export const ChannelTypeSchema = z.enum(['text', 'voice']);
export const ChannelTopicSchema = z.string().max(1024).nullable();

// Message schemas
export const MessageContentSchema = z.string().min(1).max(4000);
export const MessageIdSchema = z.string().uuid();

// Role schemas
export const RoleNameSchema = z.string().min(1).max(100);
export const RoleColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

// Auth request schemas
export const RegisterSchema = z.object({
  username: UsernameSchema,
  displayName: DisplayNameSchema,
  email: EmailSchema,
  password: PasswordSchema,
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

// Server creation schema
export const CreateServerSchema = z.object({
  name: ServerNameSchema,
  description: ServerDescriptionSchema.optional(),
});

// Channel creation schema
export const CreateChannelSchema = z.object({
  name: ChannelNameSchema,
  type: ChannelTypeSchema,
  categoryId: z.string().uuid().nullable(),
});

// Message schemas
export const SendMessageSchema = z.object({
  content: MessageContentSchema,
  attachments: z.array(z.unknown()).optional().default([]),
  replyToId: MessageIdSchema.nullable().optional(),
});

export const EditMessageSchema = z.object({
  content: MessageContentSchema,
});

// Typing indicator schema
export const TypingStartSchema = z.object({
  channelId: z.string().uuid(),
});

export const TypingStopSchema = z.object({
  channelId: z.string().uuid(),
});

// Presence schema
export const PresenceUpdateSchema = z.object({
  status: StatusSchema,
});

// Voice schemas
export const VoiceJoinSchema = z.object({
  channelId: z.string().uuid(),
});

export const VoiceMuteSchema = z.object({
  muted: z.boolean(),
});

export const VoiceDeafenSchema = z.object({
  deafened: z.boolean(),
});

// Reaction schemas
export const ReactionAddSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string(),
});

export const ReactionRemoveSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string(),
});

// Mark as read schema
export const MarkAsReadSchema = z.object({
  channelId: z.string().uuid(),
  messageId: z.string().uuid(),
});

// Category schemas
export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

// Role schemas
export const CreateRoleSchema = z.object({
  name: RoleNameSchema,
  color: RoleColorSchema,
  permissions: z.number(),
});

export const UpdateRoleSchema = z.object({
  name: RoleNameSchema.optional(),
  color: RoleColorSchema.optional(),
  permissions: z.number().optional(),
});

// Invite schemas
export const CreateInviteSchema = z.object({
  maxUses: z.number().min(1).max(100).nullable().optional(),
  expiresInHours: z.number().min(1).max(168).optional(), // max 7 days
});

export const AcceptInviteSchema = z.object({
  code: z.string().length(8),
});

// Member update schema
export const UpdateMemberSchema = z.object({
  nickname: DisplayNameSchema.nullable().optional(),
  roles: z.array(z.string().uuid()).optional(),
});

// File upload schema
export const FileUploadSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
  size: z.number().min(1).max(26214400), // 25MB max
});

// API response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

export const PaginatedResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.unknown()),
  pagination: z.object({
    hasMore: z.boolean(),
    nextCursor: z.string().uuid().nullable(),
  }),
});

// Export types
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateServerInput = z.infer<typeof CreateServerSchema>;
export type CreateChannelInput = z.infer<typeof CreateChannelSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type EditMessageInput = z.infer<typeof EditMessageSchema>;
export type TypingStartInput = z.infer<typeof TypingStartSchema>;
export type TypingStopInput = z.infer<typeof TypingStopSchema>;
export type PresenceUpdateInput = z.infer<typeof PresenceUpdateSchema>;
export type VoiceJoinInput = z.infer<typeof VoiceJoinSchema>;
export type VoiceMuteInput = z.infer<typeof VoiceMuteSchema>;
export type VoiceDeafenInput = z.infer<typeof VoiceDeafenSchema>;
export type ReactionAddInput = z.infer<typeof ReactionAddSchema>;
export type ReactionRemoveInput = z.infer<typeof ReactionRemoveSchema>;
export type MarkAsReadInput = z.infer<typeof MarkAsReadSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;
export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;
export type FileUploadInput = z.infer<typeof FileUploadSchema>;