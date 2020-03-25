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

    // TODO - extract to test:
    // console.debug('Testing encryption...');
    // // tslint:disable-next-line: no-let
    // for (let i = 0; i < 10000; i++) {
    //   console.debug('----------------------');
    //   const enc = Encryption.encrypt('404636432041508877');
    //   console.debug(enc);
    //   const dec = Encryption.decrypt(enc);
    //   console.debug(dec);
    // }
  } catch (e) {
    console.error(e);
  }
}, (2 ^ 32) - 1);

export {};
