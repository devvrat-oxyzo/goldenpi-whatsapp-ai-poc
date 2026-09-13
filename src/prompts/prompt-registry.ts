import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const PromptSkillId = {
  PublicBondEducation: "PUBLIC_BOND_EDUCATION",
} as const;

export type PromptSkillId = (typeof PromptSkillId)[keyof typeof PromptSkillId];

export interface PromptBundle {
  promptId: "goldenpi-public-information";
  promptVersion: "1.0.0";
  skillId: PromptSkillId;
  masterInstruction: string;
  skillInstruction: string;
}

const skillPaths: Record<PromptSkillId, string> = {
  PUBLIC_BOND_EDUCATION: "prompts/skills/public-bond-education/SKILL.md",
};

function readRequiredPrompt(relativePath: string): string {
  const content = readFileSync(resolve(process.cwd(), relativePath), "utf8").trim();
  if (content.length === 0) {
    throw new Error(`Prompt file is empty: ${relativePath}`);
  }
  return content;
}

export function loadPromptBundle(skillId: PromptSkillId): PromptBundle {
  return {
    promptId: "goldenpi-public-information",
    promptVersion: "1.0.0",
    skillId,
    masterInstruction: readRequiredPrompt("prompts/master.md"),
    skillInstruction: readRequiredPrompt(skillPaths[skillId]),
  };
}
