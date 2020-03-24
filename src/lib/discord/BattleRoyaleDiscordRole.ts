import Discord, { ColorResolvable } from 'discord.js';

export interface DiscordRoleObject {
  readonly color?: ColorResolvable;
  readonly name: BattleRoyaleRoleName | VerifiedRoleName;
  readonly permissions?: Discord.PermissionResolvable;
}

export type BattleRoyaleRoleName = 'Solos' | 'Duos' | 'Trios' | 'Squads';
export type VerifiedRoleName = 'Verified ✅';

export class BattleRoyaleDiscordRole {
  public static readonly VERIFIED = new BattleRoyaleDiscordRole('VERIFIED', {
    color: 'PURPLE',
    name: 'Verified ✅',
    permissions: ['READ_MESSAGE_HISTORY', 'SEND_MESSAGES', 'VIEW_CHANNEL', 'USE_EXTERNAL_EMOJIS', 'CONNECT', 'SPEAK', 'USE_VAD']
  });
  public static readonly BR_SOLOS = new BattleRoyaleDiscordRole('BR_SOLOS', { name: 'Solos' });
  public static readonly BR_DUOS = new BattleRoyaleDiscordRole('BR_DUOS', { name: 'Duos' });
  public static readonly BR_TRIOS = new BattleRoyaleDiscordRole('BR_TRIOS', { name: 'Trios' });
  public static readonly BR_SQUADS = new BattleRoyaleDiscordRole('BR_SQUADS', { name: 'Squads' });

  private constructor(private readonly key: string, public readonly value: DiscordRoleObject) {}

  public toString(): string {
    return this.key;
  }
}
