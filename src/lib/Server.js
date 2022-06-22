'use strict';

const path = require('path');

const express = require('express');
const expressSession = require('express-session');
const debug = require('debug')('Server');

const Util = require('./Util');
const ServerError = require('./ServerError');
const WireGuard = require('../services/WireGuard');

const {
  PORT,
  RELEASE,
  PASSWORD,
} = require('../config');

module.exports = class Server {

  constructor() {
    // Express
    this.app = express()
      .disable('etag')
      .use('/', express.static(path.join(__dirname, '..', 'www')))
      .use(express.json())
      .use(expressSession({
        secret: String(Math.random()),
        resave: true,
        saveUninitialized: true,
      }))

      .get('/api/release', (Util.promisify(async () => {
        return RELEASE;
      })))

      // Authentication
      .get('/api/session', Util.promisify(async req => {
        const requiresPassword = !!process.env.PASSWORD;
        const authenticated = requiresPassword
          ? !!(req.session && req.session.authenticated)
          : true;

        return {
          requiresPassword,
          authenticated,
        };
      }))
      .post('/api/session', Util.promisify(async req => {
        const {
          password,
        } = req.body;

        if (typeof password !== 'string') {
          throw new ServerError('Missing: Password', 401);
        }

        if (password !== PASSWORD) {
          throw new ServerError('Incorrect Password', 401);
        }

        req.session.authenticated = true;
        req.session.save();

        debug(`New Session: ${req.session.id})`);
      }))

      // WireGuard
      .use((req, res, next) => {
        if (!PASSWORD) {
          return next();
        }

        if (req.session && req.session.authenticated) {
          return next();
        }

        return res.status(401).json({
          error: 'Not Logged In',
        });
      })
      .delete('/api/session', Util.promisify(async req => {
        const sessionId = req.session.id;

        req.session.destroy();

        debug(`Deleted Session: ${sessionId}`);
      }))
      .get('/api/wireguard/peer', Util.promisify(async req => {
        return WireGuard.getPeers();
      }))
      .get('/api/wireguard/peer/:peerId/qrcode.svg', Util.promisify(async (req, res) => {
        const { peerId } = req.params;
        const svg = await WireGuard.getPeerQRCodeSVG({ peerId });
        res.header('Content-Type', 'image/svg+xml');
        res.send(svg);
      }))
      .get('/api/wireguard/peer/:peerId/peer.conf', Util.promisify(async (req, res) => {
        const { peerId } = req.params;
        const config = await WireGuard.getPeerConfiguration({ peerId });
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(config));
      }))
      .get('/api/wireguard/peer/:peerId/configuration', Util.promisify(async (req, res) => {
        const { peerId } = req.params;
        const peer = await WireGuard.getPeer({ peerId });
        const config = await WireGuard.getPeerConfiguration({ peerId });
        const configName = peer.name.replace(/[^a-zA-Z0-9_=+.-]/g, '-').replace(/(-{2,}|-$)/g, '-').replace(/-$/, '').substring(0, 32);
        res.header('Content-Disposition', `attachment; filename="${configName}.conf"`);
        res.header('Content-Type', 'text/plain');
        res.send(config);
      }))
      .get('/api/wireguard/server/status', Util.promisify(async (req, res) => {
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify({ status: await WireGuard.getServerStatus() }));
      }))
      .post('/api/wireguard/peer', Util.promisify(async req => {
        const { name, endpoint, attachedPeers } = req.body;
        return WireGuard.createPeer({ name, endpoint, attachedPeers });
      }))
      .delete('/api/wireguard/peer/:peerId', Util.promisify(async req => {
        const { peerId } = req.params;
        return WireGuard.deletePeer({ peerId });
      }))
      .post('/api/wireguard/peer/:peerId/enable', Util.promisify(async req => {
        const { peerId } = req.params;
        return WireGuard.enablePeer({ peerId });
      }))
      .post('/api/wireguard/peer/:peerId/disable', Util.promisify(async req => {
        const { peerId } = req.params;
        return WireGuard.disablePeer({ peerId });
      }))
      .post('/api/wireguard/server/enable', Util.promisify(async req => {
        return WireGuard.enableServer();
      }))
      .post('/api/wireguard/server/disable', Util.promisify(async req => {
        return WireGuard.disableServer();
      }))
      .put('/api/wireguard/peer/:peerId/name', Util.promisify(async req => {
        const { peerId } = req.params;
        const { name } = req.body;
        return WireGuard.updatePeerName({ peerId, name });
      }))
      .put('/api/wireguard/peer/:peerId/address', Util.promisify(async req => {
        const { peerId } = req.params;
        const { address } = req.body;
        return WireGuard.updatePeerAddress({ peerId, address });
      }))

      .listen(PORT, () => {
        debug(`Listening on http://0.0.0.0:${PORT}`);
      });
  }

};
