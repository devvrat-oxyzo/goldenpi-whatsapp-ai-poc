import { FixedAiResponder, type AiResponder } from "./ai-responder.js";
import { VertexAiResponder } from "./vertex-ai-responder.js";

export function createAiResponderFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): AiResponder {
  const mode = environment.AI_RESPONSE_MODE ?? "fixed";

  if (mode === "fixed") {
    return new FixedAiResponder();
  }

  if (mode !== "vertex") {
    throw new Error(`Unsupported AI_RESPONSE_MODE: ${mode}`);
  }

  const projectId =
    environment.VERTEX_PROJECT_ID ?? environment.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error("VERTEX_PROJECT_ID is required when AI_RESPONSE_MODE=vertex");
  }

  return new VertexAiResponder({
    projectId,
    location: environment.VERTEX_LOCATION ?? "asia-south1",
    model: environment.VERTEX_MODEL ?? "gemini-3.5-flash",
    timeoutMs: 10_000,
  });
}
