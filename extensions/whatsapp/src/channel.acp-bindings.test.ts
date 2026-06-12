// Whatsapp tests cover configured ACP binding behavior.
import { resolveConfiguredAcpBindingRecord } from "openclaw/plugin-sdk/core";
import { createTestRegistry, setActivePluginRegistry } from "openclaw/plugin-sdk/testing";
import { afterEach, describe, expect, it } from "vitest";
import { whatsappBindingsAdapter } from "./bindings.js";
import { whatsappPlugin } from "./channel.js";
import type { OpenClawConfig } from "./runtime-api.js";

function installWhatsAppPluginRegistry() {
  setActivePluginRegistry(
    createTestRegistry([
      {
        pluginId: "whatsapp",
        source: "test",
        plugin: whatsappPlugin,
      },
    ]),
  );
}

function createAcpBindingConfig(params?: {
  accountId?: string;
  peerKind?: "direct" | "group";
  peerId?: string;
}): OpenClawConfig {
  return {
    agents: {
      list: [{ id: "main" }, { id: "sandboxed-agent" }],
    },
    bindings: [
      {
        type: "acp",
        agentId: "sandboxed-agent",
        match: {
          channel: "whatsapp",
          accountId: params?.accountId ?? "sandbox",
          peer: {
            kind: params?.peerKind ?? "direct",
            id: params?.peerId ?? "whatsapp:15550001111@s.whatsapp.net",
          },
        },
        acp: {
          backend: "acpx",
          mode: "persistent",
          label: "sandboxed-agent",
        },
      },
    ],
  };
}

describe("WhatsApp ACP configured bindings", () => {
  afterEach(() => {
    setActivePluginRegistry(createTestRegistry());
  });

  it("normalizes direct WhatsApp peers through the bindings surface", () => {
    type CompileParams = Parameters<typeof whatsappBindingsAdapter.compileConfiguredBinding>[0];
    const binding = {} as CompileParams["binding"];
    const compiled = whatsappBindingsAdapter.compileConfiguredBinding({
      binding,
      conversationId: "whatsapp:15550001111@s.whatsapp.net",
    });

    expect(compiled).toEqual({ conversationId: "+15550001111" });
    expect(
      whatsappBindingsAdapter.matchInboundConversation({
        binding,
        compiledBinding: compiled!,
        conversationId: "+1 (555) 000-1111",
      }),
    ).toEqual({
      conversationId: "+15550001111",
      matchPriority: 2,
    });
  });

  it("materializes configured ACP bindings for WhatsApp direct conversations", () => {
    installWhatsAppPluginRegistry();

    const resolved = resolveConfiguredAcpBindingRecord({
      cfg: createAcpBindingConfig(),
      channel: "whatsapp",
      accountId: "sandbox",
      conversationId: "+15550001111",
    });

    expect(resolved?.spec).toMatchObject({
      channel: "whatsapp",
      accountId: "sandbox",
      conversationId: "+15550001111",
      agentId: "sandboxed-agent",
      backend: "acpx",
      label: "sandboxed-agent",
      mode: "persistent",
    });
    expect(resolved?.record.targetSessionKey).toMatch(
      /^agent:sandboxed-agent:acp:binding:whatsapp:sandbox:[a-f0-9]{16}$/,
    );
    expect(resolved?.record.targetSessionKey).not.toContain(":whatsapp:direct:");
  });

  it("materializes configured ACP bindings for WhatsApp group conversations", () => {
    installWhatsAppPluginRegistry();

    const resolved = resolveConfiguredAcpBindingRecord({
      cfg: createAcpBindingConfig({
        peerKind: "group",
        peerId: "whatsapp:group:120363401234567890@g.us",
      }),
      channel: "whatsapp",
      accountId: "sandbox",
      conversationId: "120363401234567890@g.us",
    });

    expect(resolved?.spec.conversationId).toBe("120363401234567890@g.us");
    expect(resolved?.record.targetSessionKey).toMatch(
      /^agent:sandboxed-agent:acp:binding:whatsapp:sandbox:[a-f0-9]{16}$/,
    );
  });
});
