import Discord, { GuildMember } from 'discord.js';

import * as Collections from 'typescript-collections';

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

  // tslint:disable-next-line: readonly-keyword
  private static instance: DiscordBot;

  private static readonly client = new Discord.Client({});

  private static readonly config: { readonly enabledGuilds: ReadonlyArray<EnabledGuild> } = {
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
    console.log(`Guild member added: ${guildMember.nickname}`);

    // TODO: Friday 2020-03-20
    guildMember.send('http://127.0.0.1/v1/oauth2/osu/auth');
  }

  private onMessage(msg: Discord.Message | Discord.PartialMessage): void {
    if (!DiscordBot.guildIsEnabled(msg.guild.id)) {
      return;
    }

    if (msg.content === 'ping') {
      console.log('Pong!');
      msg.reply('Pong!');
    }
  }
}
