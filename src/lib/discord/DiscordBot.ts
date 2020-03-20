import Discord, { GuildMember } from 'discord.js';
import * as Collections from 'typescript-collections';
import { UrlBuilder } from '../http/UrlBuilder';
import { OsuUser } from '../osu/OsuApi';

type GuildId = string;

interface EnabledGuild {
  readonly id: GuildId;
  readonly desc: string;
}

type EnabledGuildDictionary = Collections.Dictionary<GuildId, EnabledGuild>;

export class DiscordBot {
  public static getInstance(): DiscordBot {
    if (!DiscordBot.instance) {
      DiscordBot.instance = new DiscordBot();
    }

    return DiscordBot.instance;
  }

  public static async handleOsuOAuthSuccess(osuUser: OsuUser, discordUserId: string): Promise<void> {
    console.debug('TODO - handle osu oauth success...');
    throw new Error('Method not implemented.');
  }

  // tslint:disable-next-line: readonly-keyword
  private static instance: DiscordBot;

  private static readonly client = new Discord.Client({});

  private static readonly config: {
    readonly enabledGuilds: ReadonlyArray<EnabledGuild>;
  } = {
    enabledGuilds: [{ id: '583651277737689088', desc: 'dev' }]
  };

  private static readonly enabledJoinedGuilds: EnabledGuildDictionary = new Collections.Dictionary<string, EnabledGuild>();

  private static guildIsEnabled(guildId: string): boolean {
    return DiscordBot.enabledJoinedGuilds.containsKey(guildId);
  }

  private static buildEnabledJoinedGuilds(): void {
    const joinedGuilds = DiscordBot.client.guilds.cache;
    const enabledJoinedGuilds = DiscordBot.config.enabledGuilds.filter(enabledGuild =>
      joinedGuilds.map(jg => jg.id).includes(enabledGuild.id)
    );
    for (const enabledJoinedGuild of enabledJoinedGuilds) {
      DiscordBot.enabledJoinedGuilds.setValue(enabledJoinedGuild.id, enabledJoinedGuild);
    }
  }

  private constructor() {}

  public async init(): Promise<void> {
    console.debug('Logging in to Discord...');
    await DiscordBot.client.login(process.env.DISCORD_BOT_TOKEN);

    DiscordBot.client.on('ready', this.onReady);
    DiscordBot.client.on('message', this.onMessage);
    DiscordBot.client.on('guildMemberAdd', this.onGuildMemberAdd);

    DiscordBot.buildEnabledJoinedGuilds();
  }

  private onReady(): void {
    console.log(`Logged in as ${DiscordBot.client.user.tag}!`);
  }

  private onGuildMemberAdd(guildMember: GuildMember): void {
    console.log(`Guild member added: ${guildMember.displayName}`);

    const oauthUrl = UrlBuilder.buildInitialOauthUrlForDiscordUser(guildMember.id);
    const message = `Welcome to the battle royale! Please visit ${oauthUrl} to verify your osu! account.`;
    guildMember.send(message);

    // console.debug(message);
    // console.debug(`Plaintext: ${guildMember.id}`);
    // console.debug(`Encrypted: ${Encryption.encrypt(guildMember.id)}`);
    // console.debug(`Decrypted: ${Encryption.decrypt(Encryption.encrypt(guildMember.id))}`);
  }

  private onMessage(msg: Discord.Message | Discord.PartialMessage): void {
    if (msg?.type !== 'DEFAULT' || (msg?.guild?.id?.length > 0 && !DiscordBot.guildIsEnabled(msg?.guild?.id))) {
      return;
    }

    if (msg.content === 'ping') {
      console.log('Pong!');
      msg.reply('Pong!');
    }
  }
}
