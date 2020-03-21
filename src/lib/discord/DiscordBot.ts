import Discord, { GuildMember } from 'discord.js';
import * as Collections from 'typescript-collections';
import { UrlBuilder } from '../http/UrlBuilder';
import { BattleRoyaleDiscordRole } from './BattleRoyaleDiscordRole';

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

  private static readonly config: {
    readonly enabledGuilds: ReadonlyArray<EnabledGuild>;
  } = {
    enabledGuilds: [{ id: '583651277737689088', desc: 'dev' }]
  };

  private static readonly enabledJoinedGuilds: EnabledGuildDictionary = new Collections.Dictionary<string, EnabledGuild>();

  private static readonly observedJoinedGuildMembers: Collections.Dictionary<string, GuildMember> = new Collections.Dictionary<
    string,
    GuildMember
  >();

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

  private static getObservedDiscordUser(discordUserId: string): GuildMember {
    return DiscordBot.observedJoinedGuildMembers.getValue(discordUserId);
  }

  private static async createRoleIfNotExists(discordRoleData: Discord.RoleData, guild: Discord.Guild): Promise<Discord.Role> {
    const roles: Discord.RoleManager = await guild.roles.fetch();
    const existingRole: Discord.Role = roles.cache.find(r => r.name === discordRoleData.name);
    if (existingRole) {
      console.debug(`Role '${existingRole.name}' already exists. Using this role.`);
      return existingRole;
    }
    console.debug(`Role '${discordRoleData.name}' did not exist. Creating this role...`);
    const newRole: Discord.Role = await guild.roles.create({ data: discordRoleData });
    return newRole;
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

  public async sendPrivateMessage(discordUserId: string, message: string): Promise<void> {
    console.debug(`Sending DM to user: '${message}'`);
    const discordUser = DiscordBot.getObservedDiscordUser(discordUserId);
    if (!discordUser) {
      return new Promise((resolve, reject) => reject('Discord user not found.'));
    }

    try {
      await discordUser.send(message);
    } catch (error) {
      console.error('Failed to send message to Discord user', error);
      throw error;
    }
  }

  public async setNickname(discordUserId: string, nickname: string, reason?: string): Promise<void> {
    console.debug('Setting nickname of user...');
    const discordUser = DiscordBot.getObservedDiscordUser(discordUserId);
    if (!discordUser) {
      return new Promise((resolve, reject) => reject('Discord user not found.'));
    }

    await discordUser.setNickname(nickname, reason);
  }

  public async assignRole(discordUserId: string, newRole: BattleRoyaleDiscordRole, reason?: string): Promise<void> {
    console.debug(`Assigning role '${newRole.value.name}' to user...`);
    const discordUser = DiscordBot.getObservedDiscordUser(discordUserId);
    if (!discordUser) {
      return new Promise((resolve, reject) => reject('Discord user not found.'));
    }

    // create the role
    const discordGuild: Discord.Guild = discordUser.guild;
    const discordRoleData: Discord.RoleData = {
      color: newRole.value.color,
      name: newRole.value.name,
      permissions: newRole.value.permissions
    };
    const discordRole = await DiscordBot.createRoleIfNotExists(discordRoleData, discordGuild);

    // assign role to user
    console.debug('Assigning role to user...');
    await discordUser.roles.add(discordRole, reason);
  }

  private onReady(): void {
    console.log(`Logged in as ${DiscordBot.client.user.tag}!`);
  }

  private onGuildMemberAdd(guildMember: GuildMember): void {
    console.log(`Guild member added: ${guildMember.displayName}`);
    const oauthUrl = UrlBuilder.buildInitialOauthUrlForDiscordUser(guildMember.id);
    const message = `Welcome to the battle royale! Please visit ${oauthUrl} to verify your osu! account.`;

    guildMember.send(message);
    DiscordBot.observedJoinedGuildMembers.setValue(guildMember.id, guildMember);
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