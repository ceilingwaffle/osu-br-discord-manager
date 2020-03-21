import { OsuUser } from '../osu/OsuApi';
import { BattleRoyaleDiscordRole } from './BattleRoyaleDiscordRole';
import { DiscordBot } from './DiscordBot';

export class DiscordService {
  public static readonly config = {
    minRank: 9999
  };

  public static async handleOsuOAuthSuccess(osuUser: OsuUser, discordUserId: string): Promise<void> {
    console.debug(`Checking rank '${osuUser.rank}'...`);
    if (osuUser.rank > DiscordService.config.minRank) {
      console.debug('Denying user server access due to rank.');
      await DiscordService.denyUserAccess(osuUser, discordUserId);
      return;
    }

    console.debug('Setting up new user on server...');
    await DiscordService.setupNewUser(discordUserId, osuUser);
  }

  private static async denyUserAccess(osuUser: OsuUser, discordUserId: string): Promise<void> {
    const message = `Sorry, your rank is ${osuUser.rank} but you must be at least rank ${DiscordService.config.minRank} to participate in the battle royale! ✋`;
    await DiscordBot.getInstance().sendPrivateMessage(discordUserId, message);
    // Could do other stuff here like kick the user. Depends how we want to handle it...
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
