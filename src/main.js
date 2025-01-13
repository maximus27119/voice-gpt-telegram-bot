import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import config from 'config';
import { ogg } from './ogg.js';
import { openAIClient } from './openai.js';
import { code } from 'telegraf/format';
import OpenAI from 'openai';
import { removeFile } from './utils.js';

const bot = new Telegraf(config.get('TELEGRAM_BOT_TOKEN'));

bot.on(message('voice'), async (ctx) => {
  try {
    const loadingMessage = await ctx.reply(code(`The message is accepted. Waiting for server's response...`));
    const voiceFileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userId = String(ctx.message.from.id);
    const oggPath = await ogg.create(voiceFileLink.href, userId);
    const mp3Path = await ogg.toMP3(oggPath, userId);

    const text = await openAIClient.transcription(mp3Path);

    await ctx.reply(code(`Your request is: ${text}`));
    await removeFile(mp3Path);

    const messages = [{ role: openAIClient.roles.USER, content: text }];
    // const response = await openAIClient.chat(text);
    // await ctx.reply(response.content);
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);

  } catch (e) {
    console.error('Error while voice parsing.', e.message);
  }
});

bot.command('start', async (ctx) => {
  await ctx.reply(JSON.stringify(ctx.message, null, 2));
});

bot.launch(() => console.log('Bot has been started'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
