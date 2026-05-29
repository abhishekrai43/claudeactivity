export interface FileAccess {
  filePath: string;
  kind: "read" | "write" | "edit" | "grep" | "glob" | "bash" | "agent" | "other";
}

/** Token usage for one model within a session. */
export interface ModelUsage {
  input: number;          // fresh input tokens (not cached)
  output: number;         // output tokens
  cacheCreate: number;    // cache_creation_input_tokens (cache writes)
  cacheRead: number;      // cache_read_input_tokens (cache hits)
}

export interface SessionData {
  sessionId: string;
  logPath: string;
  projectPath: string;
  projectDir: string;
  accesses: FileAccess[];
  toolCounts: Record<string, number>;  // tool name -> count
  usage: Record<string, ModelUsage>;   // model name -> token usage
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  messageCount: number;
}
