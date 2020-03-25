import Discord from 'discord.js';
import { arrayDifference, arrayIntersection } from '../helpers';
import { UrlBuilder } from '../http/UrlBuilder';
import { OsuUser } from '../osu/OsuApi';
import { Store } from '../store/Store';
import { BattleRoyaleDiscordRole, BattleRoyaleRoleName, BR_ROLE_NAMES } from './BattleRoyaleDiscordRole';
import { DiscordBot } from './DiscordBot';

export class DiscordService {
  public static async handleOsuOAuthSuccess(osuUser: OsuUser, discordUserId: string): Promise<void> {
    console.debug(`Checking rank '${osuUser.rank}'...`);
    const minRank: number = await Store.get('config.minRank');
    if (osuUser.rank > minRank) {
      console.debug('Denying user server access due to rank.');
      await DiscordService.denyUserAccess(osuUser, discordUserId);
      return;
    }

    console.debug('Setting up new user on server...');
    await DiscordService.setupNewUser(discordUserId, osuUser);
  }

  public static async assignPlayerRolesToUser(discordUserId: string, possiblyInvalidSelectedRoles: readonly string[]): Promise<void> {
    const allRoles: readonly BattleRoyaleRoleName[] = BR_ROLE_NAMES;
    const selectedRoles: readonly BattleRoyaleRoleName[] = arrayIntersection(allRoles, possiblyInvalidSelectedRoles);
    const unselectedRoles: readonly string[] = arrayDifference(allRoles, selectedRoles);

    // assign/remove the user some BR roles (e.g. solos, duos, trios, squads)
    console.debug(`Removing player roles '${unselectedRoles.join(', ')}' from Discord user '${discordUserId}'`);
    console.debug(`Assigning player roles '${selectedRoles.join(', ')}' to Discord user '${discordUserId}'`);
    for (const roleString of allRoles) {
      const role = this.buildDiscordRoleForRoleName(roleString);
      // TODO - optimize N+1
      if (selectedRoles.includes(roleString)) {
        await DiscordBot.getInstance().assignRole(discordUserId, role, 'The user selected some battle royale player roles.');
      } else {
        await DiscordBot.getInstance().removeRole(discordUserId, role, 'The user did not select some battle royale player roles.');
      }
    }
  }

  public static async sendOsuOAuthVerificationLinkToDiscordUser(discordUser: Discord.User | Discord.GuildMember): Promise<void> {
    const oauthUrl = UrlBuilder.buildInitialOauthUrlForDiscordUser(discordUser.id);
    const message = `Welcome to the battle royale! Please visit ${oauthUrl} to verify your osu! account.`;
    await discordUser.send(message);
  }

  private static buildDiscordRoleForRoleName(roleName: BattleRoyaleRoleName): BattleRoyaleDiscordRole {
    // tslint:disable-next-line: no-let
    let role: BattleRoyaleDiscordRole;
    if (roleName === 'Duos') {
      role = BattleRoyaleDiscordRole.BR_DUOS;
    } else if (roleName === 'Solos') {
      role = BattleRoyaleDiscordRole.BR_SOLOS;
    } else if (roleName === 'Squads') {
      role = BattleRoyaleDiscordRole.BR_SQUADS;
    } else if (roleName === 'Trios') {
      role = BattleRoyaleDiscordRole.BR_TRIOS;
    } else {
      const exhaustiveCheck: never = roleName;
      return exhaustiveCheck;
    }
    return role;
  }

  private static async denyUserAccess(osuUser: OsuUser, discordUserId: string): Promise<void> {
    const minRank: number = await Store.get('config.minRank');
    const message = `Sorry, your rank is ${osuUser.rank} but you must be at least rank ${minRank} to participate in the battle royale! ✋`;
    await DiscordBot.getInstance().sendPrivateMessage(discordUserId, message);
    // TODO: kick the user
  }

  private static async setupNewUser(discordUserId: string, osuUser: OsuUser): Promise<void> {
    // Send DM to user
    const message = `Thanks for authenticating your osu! account. Welcome to the server, and good luck! 😎`;
    await DiscordBot.getInstance().sendPrivateMessage(discordUserId, message);

    const reason = 'Authenticated osu! account and verified rank within allowed range.';

    // Set the nickname of the user
    const nickname = osuUser.username;
    await DiscordBot.getInstance().setNickname(discordUserId, nickname, reason);

    // Assign the user the 'verified' role
    await DiscordBot.getInstance().assignRole(discordUserId, BattleRoyaleDiscordRole.VERIFIED, reason);
  }
}
