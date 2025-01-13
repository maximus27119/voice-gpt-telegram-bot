import { Telegraf, session } from 'telegraf';
import { message } from 'telegraf/filters';
import config from 'config';
import { ogg } from './ogg.js';
import { openAIClient } from './openai.js';
import { code } from 'telegraf/format';
import { removeFile } from './utils.js';

const INITIAL_SESSION = {
  messages: []
};

const bot = new Telegraf(config.get('TELEGRAM_BOT_TOKEN'));

bot.use(session());

bot.command('new', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply(`A new session is created. I'm waiting for your voice/text message.`);
});

bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply(`I'm waiting for your voice/text message.`);
});

bot.on(message('text'), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  try {
    const userSessionItem = { role: openAIClient.roles.USER, content: ctx.message.text };
    ctx.session.messages.push(userSessionItem);

    const response = await openAIClient.chat(ctx.session.messages);

    const assistantMessage = response.content;
    const assistantSessionItem = { role: openAIClient.roles.ASSISTANT, content: assistantMessage };
    ctx.session.messages.push(assistantSessionItem);

    await ctx.reply(assistantMessage);
  } catch (e) {
    console.error('Error while text chatting.', e.message);
  }
});

bot.on(message('voice'), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  try {
    const loadingMessage = await ctx.reply(code(`The message is accepted. Waiting for server's response...`));

    const voiceFileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userId = String(ctx.message.from.id);

    const oggPath = await ogg.create(voiceFileLink.href, userId);
    const mp3Path = await ogg.toMP3(oggPath, userId);

    const text = await openAIClient.transcription(mp3Path);
    await ctx.reply(code(`Your request is: ${text}`));
    await removeFile(mp3Path);

    const userSessionItem = { role: openAIClient.roles.USER, content: text };
    ctx.session.messages.push(userSessionItem);

    const response = await openAIClient.chat(ctx.session.messages);

    const assistantMessage = response.content;
    const assistantSessionItem = { role: openAIClient.roles.ASSISTANT, content: assistantMessage };
    ctx.session.messages.push(assistantSessionItem);

    await ctx.reply(assistantMessage);
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);
  } catch (e) {
    console.error('Error while voice parsing.', e.message);
  }
});

bot.launch(() => console.log('Bot has been started'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
