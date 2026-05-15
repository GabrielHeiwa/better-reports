import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { MessageDto } from './chat-message.dto';

const SYSTEM_PROMPT = `You are an expert HTML report template assistant.
The user is building an HTML report template with Handlebars syntax ({{variable}}, {{#each}}, {{#if}}, etc.).
You help modify, improve, and build their template based on their requests.

When you modify the HTML template, ALWAYS return the complete updated HTML inside a \`\`\`html code block.
Only include the code block when you actually changed the template.
Keep Handlebars expressions intact unless the user asks to change them.
Be concise in your explanations.`;

@Injectable()
export class LlmService {
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOrThrow<string>('OPENROUTER_API_KEY');
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });
  }

  async *streamChat(
    messages: MessageDto[],
    template: string,
    parameters: Record<string, unknown>,
  ): AsyncGenerator<string> {
    const contextMessage = {
      role: 'user' as const,
      content: `Current template:\n\`\`\`html\n${template}\n\`\`\`\n\nCurrent parameters:\n\`\`\`json\n${JSON.stringify(parameters, null, 2)}\n\`\`\``,
    };

    const allMessages = [
      contextMessage,
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    const stream = await this.client.chat.completions.create({
      model: 'moonshotai/kimi-k2',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...allMessages],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
