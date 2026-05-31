type Environment = Record<string, string | undefined>;

interface ResponseLike {
  status?: (code: number) => ResponseLike;
  setHeader: (name: string, value: string) => void;
  end: (chunk?: string) => void;
}

export function getHealth(env: Environment = process.env) {
  return {
    status: "ok",
    configured: Boolean(env.DEEPSEEK_API_KEY),
    mockAllowed: env.ALLOW_MOCK_LLM === "true"
  };
}

export default function handler(
  _request: unknown,
  response: ResponseLike
): void {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(getHealth()));
}
