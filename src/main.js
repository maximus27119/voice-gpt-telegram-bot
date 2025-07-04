import { Telegraf, session } from 'telegraf';
import { message } from 'telegraf/filters';
import config from 'config';
import { ogg } from './ogg.js';
import { openAIClient } from './openai.js';
import { code } from 'telegraf/format';
import { removeFile } from './utils.js';

const INITIAL_SESSION = {
  messages: [
    {
      role: openAIClient.roles.SYSTEM,
      content:
        'You are a multilingual shopping list assistant.' +
        'The user speaks in any language — your task is to understand and update their shopping list accordingly.' +
        'You only do three things:' +
        '– Add items to the list' +
        '– Remove items from the list' +
        '– Reorder items in the list' +
        'Format the list as: 1. Product 1, 2. Product 2, 3. Product 3, ...' +
        'Handle casual or voice-style input (e.g. "add bread", "delete milk", "move eggs to the top").' +
        'After each change, respond briefly with an acknowledgment (e.g. "Added bread ✅", "Removed milk ❌", "Moved eggs to #1 🔀") and show the updated list.' +
        'Ignore all unrelated requests. Do not respond to anything outside of shopping list operations.'
    },
  ]
};
const BOT_TOKEN = config.get('TELEGRAM_BOT_TOKEN');
const RESPONSE_WAIT_MESSAGE = `The message is accepted. Waiting for server's response...`;
const NEW_SESSION_MESSAGE = `A new session is created. I'm waiting for your voice/text message.`;
const START_MESSAGE = `I'm waiting for your voice/text message.`;

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

const processUserTextMessage = async (ctx, content) => {
  ctx.session ??= INITIAL_SESSION;

  const userMessage = { role: openAIClient.roles.USER, content };
  ctx.session.messages.push(userMessage);

  const response = await openAIClient.chat(ctx.session.messages);

  const assistantMessage = response.content;
  ctx.session.messages.push({ role: openAIClient.roles.ASSISTANT, content: assistantMessage });

  await ctx.reply(assistantMessage);
};

bot.command('new', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply(NEW_SESSION_MESSAGE);
});

bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply(START_MESSAGE);
});

bot.on(message('text'), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  try {
    await processUserTextMessage(ctx, ctx.message.text);
  } catch (error) {
    console.error('Error while processing text message:', error.message);
  }
});

bot.on(message('voice'), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;

  let loadingMessage;
  try {
    loadingMessage = await ctx.reply(code(RESPONSE_WAIT_MESSAGE));

    const voiceFileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userId = String(ctx.message.from.id);

    const oggPath = await ogg.create(voiceFileLink.href, userId);
    const mp3Path = await ogg.toMP3(oggPath, userId);

    const transcribedText = await openAIClient.transcription(mp3Path);
    await ctx.reply(code(`Your request is: ${transcribedText}`));
    await removeFile(mp3Path);

    await processUserTextMessage(ctx, transcribedText);
  } catch (error) {
    console.error('Error while processing voice message:', error.message);
  } finally {
    if (loadingMessage) await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);
  }
});

bot.launch(() => console.log('Bot has been started'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
