# WireGuard Enhanced

[//]: # ([![Build & Publish Docker Image to Docker Hub]&#40;https://github.com/WeeJeWel/wg-easy/actions/workflows/deploy.yml/badge.svg?branch=production&#41;]&#40;https://github.com/WeeJeWel/wg-easy/actions/workflows/deploy.yml&#41;)

[//]: # ([![Lint]&#40;https://github.com/WeeJeWel/wg-easy/actions/workflows/lint.yml/badge.svg?branch=master&#41;]&#40;https://github.com/WeeJeWel/wg-easy/actions/workflows/lint.yml&#41;)

[//]: # ([![Docker]&#40;https://img.shields.io/docker/v/weejewel/wg-easy/latest&#41;]&#40;https://hub.docker.com/r/weejewel/wg-easy&#41;)

[//]: # ([![Docker]&#40;https://img.shields.io/docker/pulls/weejewel/wg-easy.svg&#41;]&#40;https://hub.docker.com/r/weejewel/wg-easy&#41;)

[//]: # ([![Sponsor]&#40;https://img.shields.io/github/sponsors/weejewel&#41;]&#40;https://github.com/sponsors/WeeJeWel&#41;)

### This is a fork of the [wg-easy](https://github.com/WeeJeWel/wg-easy) project by [Emile Nijseen](https://emilenijssen.nl/?ref=wg-easy). 

You have found the easiest way to install & manage WireGuard on any Linux host!
Instead of displaying a server/client relationship, this fork enables the creation of multi-peer networks.
Currently, there are two types of peers:
* Static Peers with well-known endpoints
* Roaming Peers with non-static endpoints and/or behind a NAT.

[//]: # (<div>)

[//]: # (    <div>)

[//]: # (        <img src="./assets/home-page.png" width=50% />)

[//]: # (    </div>)

[//]: # (    <div>)

[//]: # (        <img src="./assets/1.png" width=40% />)

[//]: # (    </div>)

[//]: # (    <div>)

[//]: # (        <img src="./assets/1.png" width=40% />)

[//]: # (    </div>)

[//]: # (</div>)

<table>
 <tr>
  <td rowspan="3">
    <img src="./assets/home-page.png" width="500"/>
  </td>
  <td>
    <img src="./assets/1.png" width="300" />
  </td>
 </tr>
 <tr>
  <td>
    <img src="./assets/2.png" width="300" />
  </td>
 </tr>
 <tr>
  <td>
    <img src="./assets/3.png" width="300" />
  </td>
 </tr>
</table>


## Features

* All-in-one: WireGuard + Web UI.
* Easy installation, simple to use.
* List, create, edit, delete peers.
* Enable and disable connections.
* Regenerate public, private, and pre-shared keys.
* Set PersistentKeepalive by connection.
* Configure DNS and MTU fields for each peer.
* Configure PreUp, PostUp, PreDown, PostDown scripts for each peer.
* Create networks with multiple static peers.
* Show a client's QR code.
* Download a client's configuration file.
* Statistics for which clients are connected.
* Tx/Rx charts for each connected client.
* Gravatar support.
* An interactive network map.
* Status indicator for the web server and a toggle for the WireGuard interface.


## Requirements

* A host with a kernel that supports WireGuard (all modern kernels).
* A host with Docker installed.

## Installation

### 1. Install Docker

If you haven't installed Docker yet, install it by running:

```bash
$ curl -sSL https://get.docker.com | sh
$ sudo usermod -aG docker $(whoami)
$ exit
```

And log in again.

### 2. Run WireGuard Easy

To automatically install & run wg-easy, simply run:

<pre>
$ docker run -d \
  --name=wg-easy \
  -e WG_HOST=<b>🚨YOUR_SERVER_IP</b> \
  -e PASSWORD=<b>🚨YOUR_ADMIN_PASSWORD</b> \
  -v ~/.wg-easy:/etc/wireguard \
  -p 51820:51820/udp \
  -p 51821:51821/tcp \
  --cap-add=NET_ADMIN \
  --cap-add=SYS_MODULE \
  --sysctl="net.ipv4.conf.all.src_valid_mark=1" \
  --sysctl="net.ipv4.ip_forward=1" \
  --restart unless-stopped \
  weejewel/wg-easy
</pre>

> 💡 Replace `YOUR_SERVER_IP` with your WAN IP, or a Dynamic DNS hostname.
> 
> 💡 Replace `YOUR_ADMIN_PASSWORD` with a password to log in on the Web UI.

The Web UI will now be available on `http://0.0.0.0:51821`.

> 💡 Your configuration files will be saved in `~/.wg-easy`

### 3. Sponsor

Are you enjoying this project? [Buy Emile a beer!](https://github.com/sponsors/WeeJeWel) 🍻

## Options

These options can be configured by setting environment variables using `-e KEY="VALUE"` in the `docker run` command.

| Env | Default | Example | Description |
| - | - | - | - |
| `PASSWORD` | - | `foobar123` | When set, requires a password when logging in to the Web UI. |
| `WG_HOST` | - | `vpn.myserver.com` | The public hostname of your VPN server. |
| `WG_PORT` | `51820` | `12345` | The public UDP port of your VPN server. WireGuard will always listen on `51820` inside the Docker container. |
| `WG_MTU` | `null` | `1420` | The MTU the clients will use. Server uses default WG MTU. |
| `WG_PERSISTENT_KEEPALIVE` | `0` | `25` | Value in seconds to keep the "connection" open. |
| `WG_DEFAULT_ADDRESS` | `10.8.0.x` | `10.6.0.x` | Clients IP address range. |
| `WG_DEFAULT_DNS` | `1.1.1.1` | `8.8.8.8, 8.8.4.4` | DNS server clients will use. |
| `WG_ALLOWED_IPS` | `0.0.0.0/0, ::/0` | `192.168.15.0/24, 10.0.1.0/24` | Allowed IPs clients will use. |
| `WG_POST_UP` | `...` | `iptables ...` | See [config.js](https://github.com/WeeJeWel/wg-easy/blob/master/src/config.js#L19) for the default value. |
| `WG_POST_DOWN` | `...` | `iptables ...` | See [config.js](https://github.com/WeeJeWel/wg-easy/blob/master/src/config.js#L26) for the default value. |

> If you change `WG_PORT`, make sure to also change the exposed port.

# Updating

To update to the latest version, simply run:

```bash
docker stop wg-easy
docker rm wg-easy
docker pull weejewel/wg-easy
```

And then run the `docker run -d \ ...` command above again.