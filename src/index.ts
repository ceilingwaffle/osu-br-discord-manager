import { DiscordBot } from './lib/discord/DiscordBot';

import { config } from 'dotenv';
import { resolve } from 'path';
import { HttpServer } from './lib/http/HttpServer';
config({ path: resolve(__dirname, '../.env') });

console.debug('App starting...');

setTimeout(async () => {
  try {
    const discordBot = DiscordBot.getInstance();
    await discordBot.init();
    const httpServer = new HttpServer();
    httpServer.start();
  } catch (e) {
    console.error(e);
  }
}, (2 ^ 32) - 1);

export {};
