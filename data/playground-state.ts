/* import { TurnDetectionTypeId } from "@/data/turn-end-types";
import { ModalitiesId } from "@/data/modalities";
import { VoiceId } from "@/data/voices";
import { Preset } from "./presets";
import { ModelId } from "./models";
import { TranscriptionModelId } from "./transcription-models"; */

// ERP consultant instructions
export const ERP_CONSULTANT_INSTRUCTIONS = `You are a technology consultant specializing in ERP system design. Your task is
to have a friendly conversation with the client, with the overall goal of
gathering all necessary information. You must obtain information about the
following points, but it's very important that the conversation feels natural,
and that you answer any question the customer has about how we work (you can
make up the details) and recommendations about the system.

When the user asks you to save a title for the conversation, use the saveTitle
tool to store their preferred title. For example, if they say "Please save this
conversation with the title 'ERP Planning for Acme Corp'", you should use the
tool to save that title.

When the user wants to end the conversation, use the finishConversation tool to
save the transcript and conclude the session. The user might say something like
"Let's finish our conversation" or "Please save our conversation".

Use un lenguaje y acento bien argentinos, con expresiones típicas locales.`;

export interface SessionConfig {
  model: string;
  transcriptionModel: string;
  turnDetection: string;
  modalities: string;
  voice: string;
  temperature: number;
  maxOutputTokens: number | null;
  vadThreshold: number;
  vadSilenceDurationMs: number;
  vadPrefixPaddingMs: number;
}

export interface PlaygroundState {
  sessionConfig: SessionConfig;
  //userPresets: Preset[];
  selectedPresetId: string | null;
  openaiAPIKey: string | null | undefined;
  instructions: string;
}

export const defaultSessionConfig: SessionConfig = {
  model: "gpt-4o-mini-realtime-preview",
  transcriptionModel: "whisper-1",
  turnDetection: "Server VAD",
  modalities: "Audio + Text",
  voice: "ash",
  temperature: 0.8,
  maxOutputTokens: 1000, //null
  vadThreshold: 0.5,
  vadSilenceDurationMs: 200,
  vadPrefixPaddingMs: 300,
};

// Define the initial state
export const defaultPlaygroundState: PlaygroundState = {
  sessionConfig: { ...defaultSessionConfig },
  //userPresets: [],
  selectedPresetId: "helpful-ai",
  openaiAPIKey: process.env.OPENAI_API_KEY,
  instructions: ERP_CONSULTANT_INSTRUCTIONS
};
