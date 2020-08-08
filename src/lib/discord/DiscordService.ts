import Discord from 'discord.js';
import { arrayDifference, arrayIntersection } from '../helpers';
import { UrlBuilder } from '../http/UrlBuilder';
import { OsuApi, OsuUser } from '../osu/OsuApi';
import { Store } from '../store/Store';
import { BattleRoyaleDiscordRole, BattleRoyaleRoleName, BR_ROLE_NAMES } from './BattleRoyaleDiscordRole';
import { DiscordBot } from './DiscordBot';

export class DiscordService {
  public static async handleOsuOAuthSuccess(osuUser: OsuUser, discordUserId: string): Promise<boolean> {
    try {
      console.debug(`Checking rank '${osuUser.rank}'...`);
      const minRank: number = await Store.get('config.minRank');
      if (osuUser.rank > minRank) {
        console.debug('Setting up new observer user (less than min rank)...');
        await DiscordService.setupObserverUser(osuUser, discordUserId);
        return false;
      }

      console.debug('Setting up new verified user on server...');
      await DiscordService.setupVerifiedUser(discordUserId, osuUser);
      return true;
    } catch (error) {
      console.error('Error during handleOsuOAuthSuccess process:', error);
      throw error;
    }
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

  public static async getResultsForAverageRankCommand(message: string): Promise<string> {
    const osuApi = new OsuApi();

    // extract the !command from the message
    const split = message.split(' ')
    split.shift();
    const messageWithoutCommand = split.join(' ');

    // group usernames into teams
    const teams = messageWithoutCommand.split('\n');

    // tslint:disable-next-line: readonly-keyword readonly-array
    const teamsBuilt: Array<{avgRank: number, osuUsers: OsuUser[]}> = [];

    for (const team of teams) {
      const teamUsernames = team.split(',').map(u => u.trim());
      const usersBuilt = new Array<OsuUser>();
      for (const username of teamUsernames) {
        const osuUser = await osuApi.getOsuUserForUsername(username);
        usersBuilt.push(osuUser);
      }

      teamsBuilt.push({
        avgRank: Math.round(usersBuilt.map(u => u.rank).reduce((a,b) => a + b) / usersBuilt.length),
        osuUsers: usersBuilt,
      });
    }

    // sort by team average ranks
    teamsBuilt.sort((a,b) => a.avgRank - b.avgRank)

    // build the string output
    // tslint:disable-next-line: no-let
    const stringOutput = new Array();

    // tslint:disable-next-line: no-let
    for (let i=0; i < teamsBuilt.length; i++) {
      const team = teamsBuilt[i];
      const position = i+1;
      const avgRank = team.avgRank;
      const userFormattedStrings = team.osuUsers.map(u => u.error.length ? `\`${u.error}\`` : `${u.username} (#${u.rank})`);
      stringOutput.push(`${position}. #${avgRank} - ${userFormattedStrings.join(', ')}`);
    }

    return stringOutput.join('\n');
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

  private static async setupObserverUser(osuUser: OsuUser, discordUserId: string): Promise<void> {
    const minRank: number = await Store.get('config.minRank');
    const message = `Sorry, your rank is ${osuUser.rank} but you must be at least rank ${minRank} to participate in the battle royale. You have been given read-only access to the server as an observer 👀`;
    // const message = `Halt ✋ You are of a pleborian rank ${osuUser.rank} and are not permitted entry 🛑 Entry is only granted to those of at least ${minRank} in osu!standard rankage 👋`;
    await DiscordBot.getInstance().sendPrivateMessage(discordUserId, message);
    
    // await DiscordBot.getInstance().kickUser(discordUserId, `osu! rank greater than '${minRank}' (rank was '${osuUser.rank}').`);

    const reason = `Authenticated osu! account and rank greater than ${minRank}.`;

    // Set the nickname of the user
    const nickname = osuUser.username;
    await DiscordBot.getInstance().setNickname(discordUserId, nickname, reason);

    // Assign the user the 'observer' role
    await DiscordBot.getInstance().assignRole(discordUserId, BattleRoyaleDiscordRole.OBSERVER, reason);
  }

  private static async setupVerifiedUser(discordUserId: string, osuUser: OsuUser): Promise<void> {
    // Send DM to user
    const message = `Thanks for authenticating your osu! account. Welcome to the server, and good luck! 😎`;
    await DiscordBot.getInstance().sendPrivateMessage(discordUserId, message);

    const reason = 'Authenticated osu! account and verified rank $within allowed range.';

    // Set the nickname of the user
    const nickname = osuUser.username;
    await DiscordBot.getInstance().setNickname(discordUserId, nickname, reason);

    // Assign the user the 'verified' role
    await DiscordBot.getInstance().assignRole(discordUserId, BattleRoyaleDiscordRole.VERIFIED, reason);

    // Assign the user the 'player' role
    await DiscordBot.getInstance().assignRole(discordUserId, BattleRoyaleDiscordRole.PLAYER, reason);
  }

}
