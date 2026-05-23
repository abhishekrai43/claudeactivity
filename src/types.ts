export interface FileAccess {
  filePath: string;
  kind: "read" | "write" | "edit" | "grep" | "glob" | "bash" | "agent" | "other";
}

export interface SessionData {
  sessionId: string;
  logPath: string;
  projectPath: string;
  projectDir: string;
  accesses: FileAccess[];
  toolCounts: Record<string, number>;  // tool name -> count
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  messageCount: number;
}
