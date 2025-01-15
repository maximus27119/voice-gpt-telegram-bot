import OpenAI from 'openai';
import { createReadStream } from 'fs';
import config from 'config';

class OpenAIClient {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.get('OPENAI_KEY')
    });

    this.roles = {
      ASSISTANT: 'assistant',
      SYSTEM: 'system',
      USER: 'user'
    };
  }

  async chat(messages) {
    try {
      const { choices } = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages
      });
      return choices?.[0]?.message || null;
    } catch (error) {
      console.error('Error during chat interaction:', error.message);
    }
  }

  async transcription(filepath) {
    try {
      const { text } = await this.openai.audio.transcriptions.create({
        file: createReadStream(filepath),
        model: 'whisper-1'
      });
      return text;
    } catch (error) {
      console.error('Error during transcription:', error.message);
    }
  }
}

export const openAIClient = new OpenAIClient();
