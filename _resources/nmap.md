---
title: "Nmap"
excerpt: "scripts, commands, flags, and other things that I need often"
---

## Scripts

- Scripts are usually in `/usr/share/nmap/scripts/` or `/opt/homebrew/share/nmap/scripts`
- To update scripts, run `nmap --script-updatedb` (maybe with `sudo`)
- Searching w/ `cat script.db | grep` can filter by lots, like `safe` or `intrusive` and `vuln`

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
