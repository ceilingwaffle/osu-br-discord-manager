import express from 'express';
import session from 'express-session';
import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import { DiscordService } from '../discord/DiscordService';
import { OsuApi } from '../osu/OsuApi';
import { Encryption } from '../store/Encryption';

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
          passReqToCallback: true,
          tokenURL: 'https://osu.ppy.sh/oauth/token'
        },
        async (req, accessToken, refreshToken, profileEmpty, verifyCallback) => {
          try {
            const osuUser = await osuApi.getOsuUserFromToken(accessToken);
            console.debug('osuUser', osuUser);
            if (!osuUser.id || !osuUser.rank || !osuUser.username) {
              throw new Error('OsuUser does not contain the expected properties.');
            }
            const encryptedDiscordUserId = req.session.euid;
            if (!encryptedDiscordUserId) {
              throw new Error('Encrypted Discord User ID (EUID) does not exist in session (oAuth).');
            }
            const discordUserId = Encryption.decrypt(encryptedDiscordUserId);
            console.debug('discordUserId', discordUserId);
            await DiscordService.handleOsuOAuthSuccess(osuUser, discordUserId);
          } catch (error) {
            console.error('Failed osu! user authentication process. Error:', error);
          }
          verifyCallback(null, {});
        }
      )
    );

    app.use(
      session({
        cookie: { secure: false },
        resave: false,
        saveUninitialized: true,
        secret: 'keyboard cat'
      })
    );

    app.use(passport.initialize());

    app.get(
      '/v1/oauth2/osu/auth',
      (req, resp, next) => {
        req.session.euid = req.query.euid;
        next();
      },
      passport.authenticate('oauth2', { session: true })
    );

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
        return res.sendStatus(200);
      }
    );

    app.get('/v1/oauth2/osu/success', async (req, res) => {
      console.log('TODO: /v1/oauth2/osu/success');
      return res.sendStatus(200);
    });

    app.get('/v1/oauth2/osu/failure', async (req, res) => {
      console.log('TODO: /v1/oauth2/osu/failure');
      return res.sendStatus(200);
    });

    app.listen(port, () => {
      console.log(`HTTP server started at http://localhost:${port}`);
    });
  }
}
