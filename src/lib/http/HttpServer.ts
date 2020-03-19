import express from 'express';
import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import { OsuApi } from '../osu/OsuApi';

export class HttpServer {
  public start(): void {
    const app = express();
    const port = 80;
    const osuApi = new OsuApi();

    passport.use(
      new OAuth2Strategy(
        {
          authorizationURL: 'https://osu.ppy.sh/oauth/authorize?scope=identify',
          callbackURL: process.env.OSU_OAUTH_CALLBACK_URL,
          clientID: process.env.OSU_OAUTH_CLIENT_ID,
          clientSecret: process.env.OSU_OAUTH_CLIENT_SECRET,
          tokenURL: 'https://osu.ppy.sh/oauth/token'
        },
        async (accessToken, refreshToken, profileEmpty, callback) => {
          try {
            const osuUser = await osuApi.getOsuUserFromToken(accessToken);
            if (!osuUser.id || !osuUser.rank || !osuUser.username) {
              throw new Error('OsuUser does not contain the expected properties.');
            }
            console.log('osuUser', osuUser);
          } catch (error) {
            console.error('Failed osu user request using access token :(');
          }
          callback(null, {});
        }
      )
    );

    app.use(passport.initialize());

    app.get('/v1/oauth2/osu/auth', passport.authenticate('oauth2'));

    app.get(
      '/v1/oauth2/osu/callback',
      passport.authenticate('oauth2', {
        failureRedirect: '/v1/oauth2/osu/failure',
        session: false,
        successRedirect: '/v1/oauth2/osu/success'
      }),
      async (req, res) => {
        // console.log('/v1/oauth2/osu/callback req.query:', req.query);
        // console.log('/v1/oauth2/osu/callback req.user:', req.user);
        return res.send(200);
      }
    );

    app.get('/v1/oauth2/osu/success', async (req, res) => {
      console.log('TODO: /v1/oauth2/osu/success');
      return res.send(200);
    });

    app.get('/v1/oauth2/osu/failure', async (req, res) => {
      console.log('TODO: /v1/oauth2/osu/failure');
      return res.send(200);
    });

    app.listen(port, () => {
      console.log(`HTTP server started at http://localhost:${port}`);
    });
  }
}
