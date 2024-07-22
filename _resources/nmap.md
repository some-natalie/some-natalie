---
title: "Nmap"
excerpt: "scripts, commands, flags, and other things that I need often"
---

## Frequent scans

I keep searching my shell history for these.

| Command | Description |
| --- | --- |
| `nmap -sS -p 1-65535 hostname` | TCP SYN scan, all ports |
| `nmap -sU -p 1-65535 hostname` | UDP scan, all ports |
| `nmap -T5 -sn 192.168.0.0/24` | Fast ping scan of a subnet |
| `nmap -p 80,443 --script "http-*" hostname` | Run all HTTP scripts against host |
| `nmap -A hostname` | OS+version detection, script scanning, traceroute |

## Scripts

- Scripts are usually in `/usr/share/nmap/scripts/` or `/opt/homebrew/share/nmap/scripts`
- To update scripts, run `nmap --script-updatedb` (maybe with `sudo`)
- Searching w/ `cat script.db | grep` can filter by lots, like `safe` or `intrusive` and `vuln`
- Use `nmap --script-help script-title-here` to see built-in man pages for that script

### SSL ciphers

Enumerate SSL/TLS ciphers supported by a server, [script docs](https://nmap.org/nsedoc/scripts/ssl-enum-ciphers.html).

```shell
nmap -sV --script ssl-enum-ciphers -p <port> <target>
```

For [FIPS 140-2](https://csrc.nist.gov/pubs/fips/140-2/upd2/final) projects - note that RC4-MD5 ciphers, Camellia ciphers, curve 25519 and other elliptic curves are all _not acceptable_ and shouldn't show up in compliant results.

### Vulners

Enumerate vulnerabilities on a host, [script docs](https://nmap.org/nsedoc/scripts/vulners.html).

```shell
nmap -sV --script vulners [--script-args mincvss=<arg_val>] <target>
```

## Links

The [nmap book](https://nmap.org/book/toc.html) has it all, somewhere.
