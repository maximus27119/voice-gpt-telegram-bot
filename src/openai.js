import OpenAI from 'openai';
import { createReadStream } from 'fs';
import config from 'config';

class OpenAIClient {
  roles = {
    ASSISTANT: 'assistant',
    SYSTEM: 'system',
    USER: 'user'
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.get('OPENAI_KEY') // Замени на свой API-ключ
    });
  }

  async chat(messages) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages
      });
      return completion.choices[0].message;
    } catch (e) {
      console.error('Error while chat with ChatGPT.', e.message);
    }
  }

  async transcription(filepath) {
    try {
      const response = await this.openai.audio.transcriptions.create({
        file: createReadStream(filepath),
        model: 'whisper-1'
      });

      return response.text;
    } catch (e) {
      console.error('Error while transcription.', e.message);
    }
  }
}

export const openAIClient = new OpenAIClient();
