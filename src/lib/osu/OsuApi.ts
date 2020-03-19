import axios, { AxiosResponse } from 'axios';

export interface OsuUser {
  readonly id: number;
  readonly rank: number;
  readonly username: string;
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
}
