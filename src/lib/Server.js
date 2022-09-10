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
      .get('/api/wireguard/network', Util.promisify(async (req, res) => {
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(await WireGuard.getNetwork())); /// await WireGuard.getNetwork()
      }))
      .get('/api/wireguard/server/status', Util.promisify(async (req, res) => {
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify({ status: await WireGuard.getServerStatus() }));
      }))
      .get('/api/wireguard/peer/preamble', Util.promisify(async (req, res) => {
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(await WireGuard.peerCreatePreamble()));
      }))
      .post('/api/wireguard/peer', Util.promisify(async req => {
        const { name, mobility, dns, mtu, endpoint, attachedPeers } = req.body;
        return WireGuard.createPeer({ name, mobility, dns, mtu, endpoint, attachedPeers });
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
      .put('/api/wireguard/peer/:peerId/endpoint', Util.promisify(async req => {
        const { peerId } = req.params;
        const { mobility, endpoint } = req.body;
        return WireGuard.updatePeerEndpoint({ peerId, mobility, endpoint });
      }))
      .put('/api/wireguard/peer/:peerId/dns', Util.promisify(async req => {
        const { peerId } = req.params;
        const { dns } = req.body;
        return WireGuard.updatePeerDNS({ peerId, dns });
      }))
      .put('/api/wireguard/peer/:peerId/mtu', Util.promisify(async req => {
        const { peerId } = req.params;
        const { mtu } = req.body;
        return WireGuard.updatePeerMTU({ peerId, mtu });
      }))
      .put('/api/wireguard/connection/:connectionId/allowedIPs', Util.promisify(async req => {
        const { connectionId } = req.params;
        const { AtoB, BtoA } = req.body;
        return WireGuard.updateClientAllowedIPs({ connectionId, AtoB, BtoA });
      }))

      .listen(PORT, () => {
        debug(`Listening on http://0.0.0.0:${PORT}`);
      });
  }

};
