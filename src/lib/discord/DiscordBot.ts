import Discord, { GuildMember } from 'discord.js';
import * as Collections from 'typescript-collections';
import { Store } from '../store/Store';
import { BattleRoyaleDiscordRole } from './BattleRoyaleDiscordRole';
import { DiscordService } from './DiscordService';

export class DiscordBot {
  public static getInstance(): DiscordBot {
    if (!DiscordBot.instance) {
      DiscordBot.instance = new DiscordBot();
    }

    return DiscordBot.instance;
  }

  // tslint:disable-next-line: readonly-keyword
  private static instance: DiscordBot;

  private static readonly client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

  private static readonly enabledJoinedGuildIds: Collections.Set<string> = new Collections.Set<string>();
  private static readonly observedGuildMembers: Collections.Dictionary<string, GuildMember> = new Collections.Dictionary<string, GuildMember>();

  private static guildIsEnabled(guildId: string): boolean {
    return DiscordBot.enabledJoinedGuildIds.contains(guildId);
  }

  private static buildEnabledJoinedGuilds(): void {
    const joinedGuilds = DiscordBot.client.guilds.cache;
    const enabledGuildIds: readonly string[] = Store.get('config.discord.enabledGuilds');
    const enabledJoinedGuildIds = enabledGuildIds.filter(enabledGuildId => joinedGuilds.map(jg => jg.id).includes(enabledGuildId));
    for (const enabledJoinedGuildId of enabledJoinedGuildIds) {
      DiscordBot.enabledJoinedGuildIds.add(enabledJoinedGuildId);
    }
  }

  private static getObservedGuildMember(discordUserId: string): GuildMember {
    return DiscordBot.observedGuildMembers.getValue(discordUserId);
  }

  private static addObservedGuildMember(discordUserId: string, guildMember: GuildMember): GuildMember | undefined {
    return DiscordBot.observedGuildMembers.setValue(discordUserId, guildMember);
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
    // DiscordBot.client.on('messageReactionAdd', this.onMessageReactionAdd);
    // DiscordBot.client.on('messageReactionRemove', this.messageReactionRemove);

    DiscordBot.buildEnabledJoinedGuilds();
  }

  public async sendPrivateMessage(discordUserId: string, message: string): Promise<void> {
    console.debug(`Sending user a DM: '${message}'`);
    const discordUser = DiscordBot.getObservedGuildMember(discordUserId);
    if (!discordUser) {
      return new Promise((resolve, reject) => reject('Discord user not found.'));
    }

    try {
      await discordUser.send(message);
    } catch (error) {
      console.error('Failed to send user a DM.', error);
      throw error;
    }
  }

  public async kickUser(discordUserId: string, reason?: string): Promise<void> {
    console.debug(`Kicking user: '${discordUserId}'`);
    const discordUser = DiscordBot.getObservedGuildMember(discordUserId);
    if (!discordUser) {
      return new Promise((resolve, reject) => reject('Discord user not found.'));
    }

    try {
      await discordUser.kick(reason);
    } catch (error) {
      console.error(`Failed to kick Discord user '${discordUserId}'.`, error);
      throw error;
    }
  }

  public async setNickname(discordUserId: string, nickname: string, reason?: string): Promise<void> {
    console.debug('Setting nickname of user...');
    const discordUser = DiscordBot.getObservedGuildMember(discordUserId);
    if (!discordUser) {
      return new Promise((resolve, reject) => reject('Discord user not found.'));
    }

    await discordUser.setNickname(nickname, reason);
  }

  public async assignRole(discordUserId: string, role: BattleRoyaleDiscordRole, reason?: string): Promise<void> {
    console.debug(`Assigning role '${role.value.name}' to user '${discordUserId}'...`);
    const guildMember = DiscordBot.getObservedGuildMember(discordUserId);
    if (!guildMember) {
      return new Promise((resolve, reject) => reject('Discord user not found.'));
    }

    // create the role
    const discordGuild: Discord.Guild = guildMember.guild;
    const discordRoleData: Discord.RoleData = {
      color: role.value.color,
      name: role.value.name,
      permissions: role.value.permissions
    };
    const discordRole = await DiscordBot.createRoleIfNotExists(discordRoleData, discordGuild);

    // assign role to user
    await guildMember.roles.add(discordRole, reason);
  }

  public async removeRole(discordUserId: string, role: BattleRoyaleDiscordRole, reason?: string): Promise<void> {
    console.debug(`Removing role '${role.value.name}' from user '${discordUserId}'...`);
    const discordUser = DiscordBot.getObservedGuildMember(discordUserId);
    if (!discordUser) {
      return new Promise((resolve, reject) => reject('Discord user not found.'));
    }

    // remove from from user
    try {
      const foundRole = discordUser.roles.cache.find(r => r.name === role.value.name);
      if (!foundRole) {
        console.warn(`Unable to remove role '${role.value.name}' because it was not found in the cache.`);
        return;
      }
      await discordUser.roles.remove(foundRole, reason);
    } catch (error) {
      console.error('Error removing role:', error);
      throw error;
    }
  }

  private onReady(): void {
    console.log(`Logged in as ${DiscordBot.client.user.tag}!`);
  }

  private async onGuildMemberAdd(guildMember: GuildMember): Promise<void> {
    if (!DiscordBot.guildIsEnabled(guildMember?.guild?.id)) {
      return;
    }

    console.log(`Guild member added: ${guildMember.displayName}`);
    await DiscordService.sendOsuOAuthVerificationLinkToDiscordUser(guildMember);
    DiscordBot.addObservedGuildMember(guildMember.id, guildMember);
    // console.debug(message);
    // console.debug(`Plaintext: ${guildMember.id}`);
    // console.debug(`Encrypted: ${Encryption.encrypt(guildMember.id)}`);
    // console.debug(`Decrypted: ${Encryption.decrypt(Encryption.encrypt(guildMember.id))}`);
  }

  private async onMessage(msg: Discord.Message | Discord.PartialMessage): Promise<void> {
    if (!msg?.guild || (msg?.guild?.id?.length > 0 && !DiscordBot.guildIsEnabled(msg?.guild?.id))) {
      return;
    }

    // Returns the GuildMember form of a User object, if the user is present in the guild.
    const guildMember = msg.guild.member(msg.author);
    if (guildMember) {
      DiscordBot.addObservedGuildMember(msg.author.id, guildMember);
    }

    if (msg.content.startsWith('!verify')) {
      await DiscordService.sendOsuOAuthVerificationLinkToDiscordUser(msg.author);
    }

    // admin stuff
    if (msg.content.startsWith('!setReactionMessage')) {
      if (this.messageWasSentByDiscordAdmin(msg)) {
        const parts = msg.content.split(' ');
        if (parts.length < 2) {
          return;
        }
        const reactionMessageId = parts[1];
        // TODO: validate reactionMessageId is a valid message ID
        // TODO: Store.set('config.discord.reactionMessageId', reactionMessageId)
      }
    }
  }

  private messageWasSentByDiscordAdmin(msg: Discord.Message | Discord.PartialMessage): boolean {
    return Store.get('config.discord.adminUserIds').includes(msg.author.id);
  }

  private async onMessageReactionAdd(reaction: Discord.MessageReaction, user: Discord.User | Discord.PartialUser): Promise<void> {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.debug('Something went wrong when fetching the message: ', error);
        return;
      }
    }

    console.debug(`${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`);
    console.debug(`${reaction.count} user(s) have given the same reaction to this message!`);
  }

  private async messageReactionRemove(reaction: Discord.MessageReaction, user: Discord.User | Discord.PartialUser): Promise<void> {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.debug('Something went wrong when fetching the message: ', error);
        return;
      }
    }

    console.debug(`${reaction.message.author}'s message "${reaction.message.content}" had a reaction removed!`);
  }
}
