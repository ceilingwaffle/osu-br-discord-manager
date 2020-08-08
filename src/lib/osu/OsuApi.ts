import axios, { AxiosResponse } from 'axios';
import { isNullOrUndefined } from 'util';

export interface OsuUser {
  readonly id: number;
  readonly rank: number;
  readonly username: string;
  readonly error?: string;
}

export class OsuApi {
  public async getOsuUserFromToken(accessToken: any): Promise<OsuUser> {
    const apiResponse = await axios.get('https://osu.ppy.sh/api/v2/me', { headers: { Authorization: `Bearer ${accessToken}` } });

    const apiUser = apiResponse?.data;

    const osuUser: OsuUser = {
      id: apiUser?.id,
      rank: apiUser?.statistics?.pp_rank,
      username: apiUser?.username
    };

    return osuUser;
  }

  public async getOsuUserForUsername(username: string): Promise<OsuUser> {
    const apiKey = process.env.OSU_API_KEY;

    const apiResponse = await axios.get(`https://osu.ppy.sh/api/get_user?k=${apiKey}&u=${username}`);

    const apiUser = apiResponse?.data;
    const apiUserId = apiUser[0]?.user_id;
    const apiUsername = apiUser[0]?.username;
    const apiRank = parseInt(apiUser[0]?.pp_rank, 10);
    const error: string = apiUserId && apiUsername && apiRank ? '' : `osu! API error for username '${username}' (check the spelling?)`;

    const osuUser: OsuUser = {
      error: error,
      id: apiUserId,
      rank: apiRank,
      username: apiUsername,
    };

    return osuUser;
  }
}
