import type { PromptBundle } from "../prompts/prompt-registry.js";

export type AiResponseSource =
  | "POC_FIXED"
  | "VERTEX_AI_GEMINI"
  | "POC_FALLBACK";

export interface AiAnswerRequest {
  question: string;
  prompt: PromptBundle;
}

export interface AiAnswer {
  text: string;
  responseSource: AiResponseSource;
  model?: string;
  promptId: string;
  promptVersion: string;
  skillId: string;
}

export interface AiResponder {
  generatePublicInformationAnswer(request: AiAnswerRequest): Promise<AiAnswer>;
}

export const publicBondFallbackAnswer =
  "A bond is a debt instrument. When you buy one, you lend money to an issuer—such as a company or government—which generally promises interest payments and repayment of principal at maturity. Bonds carry risks, including credit, interest-rate, and liquidity risk.";

export class FixedAiResponder implements AiResponder {
  constructor(private readonly responseSource: AiResponseSource = "POC_FIXED") {}

  async generatePublicInformationAnswer(
    request: AiAnswerRequest,
  ): Promise<AiAnswer> {
    return {
      text: publicBondFallbackAnswer,
      responseSource: this.responseSource,
      promptId: request.prompt.promptId,
      promptVersion: request.prompt.promptVersion,
      skillId: request.prompt.skillId,
    };
  }
}
