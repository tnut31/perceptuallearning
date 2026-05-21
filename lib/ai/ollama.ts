type OllamaGenerateResponse = {
  response?: string;
  error?: string;
};

const OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3";

export async function callOllama(prompt: string): Promise<string> {
  const response = await fetch(OLLAMA_GENERATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as OllamaGenerateResponse;

  if (data.error) {
    throw new Error(`Ollama error: ${data.error}`);
  }

  if (!data.response) {
    throw new Error("Ollama response did not include generated text.");
  }

  return data.response;
}
