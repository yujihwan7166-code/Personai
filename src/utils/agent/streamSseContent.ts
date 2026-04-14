export async function streamSseContent(
  response: Response,
  onToken: (token: string) => void,
): Promise<string> {
  if (!response.ok || !response.body) {
    throw new Error(`Streaming failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = '';
  let answer = '';
  let streamDone = false;
  let currentEvent = 'message';

  const handleDataLine = (line: string) => {
    const jsonString = line.slice(6).trim();
    if (jsonString === '[DONE]') {
      streamDone = true;
      return;
    }

    if (currentEvent !== 'message') {
      JSON.parse(jsonString);
      return;
    }

    const parsed = JSON.parse(jsonString);
    const content = parsed?.choices?.[0]?.delta?.content;

    if (typeof content === 'string' && content.length > 0) {
      answer += content;
      onToken(content);
    }
  };

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    textBuffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;

    while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith('\r')) {
        line = line.slice(0, -1);
      }

      if (line.trim() === '') {
        currentEvent = 'message';
        continue;
      }

      if (line.startsWith(':')) {
        continue;
      }

      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
        continue;
      }

      if (!line.startsWith('data: ')) {
        continue;
      }

      try {
        handleDataLine(line);
      } catch {
        textBuffer = `${line}\n${textBuffer}`;
        break;
      }
    }
  }

  if (textBuffer.trim().startsWith('data: ')) {
    handleDataLine(textBuffer.trim());
  }

  return answer;
}
