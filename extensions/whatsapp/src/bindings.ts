// Whatsapp plugin module implements configured binding behavior.
import type { ChannelPlugin } from "openclaw/plugin-sdk/channel-core";
import { normalizeWhatsAppTarget } from "./normalize.js";

function normalizeWhatsAppAcpConversationId(raw?: string | null) {
  const normalized = raw ? normalizeWhatsAppTarget(raw) : null;
  return normalized ? { conversationId: normalized } : null;
}

function matchWhatsAppAcpConversation(params: {
  bindingConversationId: string;
  conversationId: string;
}) {
  const bindingConversationId = normalizeWhatsAppAcpConversationId(
    params.bindingConversationId,
  )?.conversationId;
  const conversationId = normalizeWhatsAppAcpConversationId(params.conversationId)?.conversationId;
  if (!bindingConversationId || bindingConversationId !== conversationId) {
    return null;
  }
  return {
    conversationId,
    matchPriority: 2,
  };
}

export const whatsappBindingsAdapter = {
  compileConfiguredBinding: ({ conversationId }) =>
    normalizeWhatsAppAcpConversationId(conversationId),
  matchInboundConversation: ({ compiledBinding, conversationId }) =>
    matchWhatsAppAcpConversation({
      bindingConversationId: compiledBinding.conversationId,
      conversationId,
    }),
} satisfies NonNullable<ChannelPlugin["bindings"]>;
