import { Encryption } from '../store/Encryption';

export class UrlBuilder {
  public static buildInitialOauthUrlForDiscordUser(discordUserId: string): string {
    const encryptedId = Encryption.encrypt(discordUserId);
    return `${process.env.OSU_OAUTH_INITIAL_AUTH_URL}?euid=${encryptedId}`;
  }
}
