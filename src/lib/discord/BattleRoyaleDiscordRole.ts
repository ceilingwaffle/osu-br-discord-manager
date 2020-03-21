import Discord, { ColorResolvable } from 'discord.js';

export interface DiscordRoleObject {
  readonly color: ColorResolvable;
  readonly name: string;
  readonly permissions: Discord.PermissionResolvable;
}

export class BattleRoyaleDiscordRole {
  public static readonly VERIFIED = new BattleRoyaleDiscordRole('VERIFIED', {
    color: 'PURPLE',
    name: 'Verified ✅',
    permissions: ['READ_MESSAGE_HISTORY', 'SEND_MESSAGES', 'VIEW_CHANNEL', 'USE_EXTERNAL_EMOJIS', 'CONNECT', 'SPEAK', 'USE_VAD']
  });

  private constructor(private readonly key: string, public readonly value: DiscordRoleObject) {}

  public toString(): string {
    return this.key;
  }
}
