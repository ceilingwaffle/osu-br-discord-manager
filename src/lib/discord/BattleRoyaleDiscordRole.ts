import Discord, { ColorResolvable } from 'discord.js';

export interface DiscordRoleObject {
  readonly color?: ColorResolvable;
  readonly name: BattleRoyaleRoleName | VerifiedRoleName | PlayerRoleName;
  readonly permissions?: Discord.PermissionResolvable;
}

export type VerifiedRoleName = 'Verified ✅';
export type PlayerRoleName = 'Player';

export const BR_ROLE_NAMES = ['Solos', 'Duos', 'Trios', 'Squads'] as const;
export type BattleRoyaleRoleNameTuple = typeof BR_ROLE_NAMES;
export type BattleRoyaleRoleName = BattleRoyaleRoleNameTuple[number];

export class BattleRoyaleDiscordRole {
  public static readonly VERIFIED = new BattleRoyaleDiscordRole('VERIFIED', {
    color: 'PURPLE',
    name: 'Verified ✅',
    permissions: ['READ_MESSAGE_HISTORY', 'SEND_MESSAGES', 'VIEW_CHANNEL', 'USE_EXTERNAL_EMOJIS', 'CONNECT', 'SPEAK', 'USE_VAD']
  });
  public static readonly PLAYER = new BattleRoyaleDiscordRole('PLAYER', {
    name: 'Player',
    permissions: ['READ_MESSAGE_HISTORY', 'SEND_MESSAGES', 'VIEW_CHANNEL', 'USE_EXTERNAL_EMOJIS', 'CONNECT', 'SPEAK', 'USE_VAD']
  });
  public static readonly BR_SOLOS = new BattleRoyaleDiscordRole('BR_SOLOS', { name: 'Solos', permissions: [] });
  public static readonly BR_DUOS = new BattleRoyaleDiscordRole('BR_DUOS', { name: 'Duos', permissions: [] });
  public static readonly BR_TRIOS = new BattleRoyaleDiscordRole('BR_TRIOS', { name: 'Trios', permissions: [] });
  public static readonly BR_SQUADS = new BattleRoyaleDiscordRole('BR_SQUADS', { name: 'Squads', permissions: [] });

  private constructor(private readonly key: string, public readonly value: DiscordRoleObject) {}

  public toString(): string {
    return this.key;
  }
}
