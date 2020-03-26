import express, { Request } from 'express';
import session from 'express-session';
import fs from 'fs';
import http from 'http';
import https from 'https';
import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import path from 'path';
import { DiscordService } from '../discord/DiscordService';
import { OsuApi } from '../osu/OsuApi';
import { Encryption } from '../store/Encryption';

export class HttpServer {
  public start(): void {
    const app = express();
    const osuApi = new OsuApi();
    const publicPath = path.join(__dirname, 'public');
    const htmlPath = path.join(__dirname, 'html');
    const certPath = path.join(__dirname, 'cert');
    const privateKey = fs.readFileSync(path.join(certPath, 'server.key'));
    const certificate = fs.readFileSync(path.join(certPath, 'server.cert'));

    app.use(express.static(publicPath, { extensions: ['html'], dotfiles: 'allow' }));
    app.use(express.urlencoded({ extended: true }));

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
            const discordUserId = this.getDiscordUserIdFromSession(req);
            const accessGranted = await DiscordService.handleOsuOAuthSuccess(osuUser, discordUserId);
            if (!accessGranted) {
              req.session.denyAccess = true;
            }
            verifyCallback(null, {});
          } catch (error) {
            console.error('Failed osu! user authentication process. Error:', error);
            verifyCallback(error, {});
          }
        }
      )
    );

    app.use(
      session({
        cookie: { secure: false },
        resave: false,
        saveUninitialized: true,
        secret: process.env.SESSION_SECRET
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
        // console.debug('/v1/oauth2/osu/callback req.query:', req.query);
        // console.debug('/v1/oauth2/osu/callback req.user:', req.user);
        console.debug('GET /v1/oauth2/osu/callback, session:');
        return res.sendStatus(200);
      }
    );

    app.get('/v1/oauth2/osu/success', async (req, res) => {
      console.debug('GET /v1/oauth2/osu/success');
      if (req.session.denyAccess) {
        res.sendFile(htmlPath + '/denied.html', { euid: req.session.euid });
      } else {
        res.sendFile(htmlPath + '/roles.html', { euid: req.session.euid });
      }
    });

    app.post('/v1/oauth2/osu/success', async (req, res) => {
      try {
        console.debug('POST /v1/oauth2/osu/success');

        // gives us an array like ['solos', 'trios']
        const roles: readonly string[] = Object.entries({
          Duos: req.body.duos === 'on',
          Solos: req.body.solos === 'on',
          Squads: req.body.squads === 'on',
          Trios: req.body.trios === 'on'
        })
          .filter(e => e[1] === true)
          .map(e => e[0]);

        const discordUserId = this.getDiscordUserIdFromSession(req);
        if (!discordUserId) {
          throw new Error(`Discord User ID '${discordUserId}' is invalid.`);
        }
        await DiscordService.assignPlayerRolesToUser(discordUserId, roles);
        res.sendFile(htmlPath + '/success.html', { euid: req.session.euid });
      } catch (error) {
        return res.send('Oops! Something went wrong. Unable to assign you your discord roles. Check with the Discord server admin.');
      }
    });

    app.get('/v1/oauth2/osu/failure', async (req, res) => {
      console.debug('/v1/oauth2/osu/failure');
      return res.send('Oops! Failed to authenticate your osu! account. Please try again.');
    });

    https.createServer({ cert: certificate, key: privateKey }, app).listen(443, () => {
      console.debug(`HTTPS server started at https://localhost:443`);
    });

    http.createServer(app).listen(80, () => {
      console.debug(`HTTPS server started at http://localhost:80`);
    });
  }

  private getDiscordUserIdFromSession(req: any): string {
    const encryptedDiscordUserId = req.session.euid;
    if (!encryptedDiscordUserId) {
      const error = 'Encrypted Discord User ID (EUID) does not exist in session (oAuth).';
      console.error(error);
      throw new Error(error);
    }
    const discordUserId = Encryption.decrypt(encryptedDiscordUserId);
    return discordUserId;
  }
}
