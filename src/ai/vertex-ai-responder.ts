import { FinishReason, GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { AiAnswer, AiAnswerRequest, AiResponder } from "./ai-responder.js";

export interface VertexAiResponderConfig {
  projectId: string;
  location: string;
  model: string;
  timeoutMs?: number;
}

export const publicInformationGenerationConfig = {
  temperature: 0.2,
  maxOutputTokens: 1_024,
  thinkingConfig: {
    thinkingLevel: ThinkingLevel.LOW,
  },
};

export class VertexAiResponder implements AiResponder {
  private readonly client: GoogleGenAI;

  constructor(private readonly config: VertexAiResponderConfig) {
    this.client = new GoogleGenAI({
      vertexai: true,
      project: config.projectId,
      location: config.location,
      apiVersion: "v1",
      httpOptions: { timeout: config.timeoutMs ?? 10_000 },
    });
  }

  async generatePublicInformationAnswer(
    request: AiAnswerRequest,
  ): Promise<AiAnswer> {
    const response = await this.client.models.generateContent({
      model: this.config.model,
      contents: [
        {
          role: "user",
          parts: [{ text: request.question }],
        },
      ],
      config: {
        systemInstruction: [
          request.prompt.masterInstruction,
          request.prompt.skillInstruction,
        ].join("\n\n"),
        ...publicInformationGenerationConfig,
      },
    });

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === FinishReason.MAX_TOKENS) {
      throw new Error("Vertex AI response reached the output-token limit");
    }

    const text = response.text?.trim();
    if (!text) {
      throw new Error("Vertex AI returned no text");
    }

    return {
      text,
      responseSource: "VERTEX_AI_GEMINI",
      model: this.config.model,
      promptId: request.prompt.promptId,
      promptVersion: request.prompt.promptVersion,
      skillId: request.prompt.skillId,
    };
  }
}
