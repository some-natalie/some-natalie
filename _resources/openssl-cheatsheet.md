---
title: "OpenSSL cheatsheet"
excerpt: "tl;dr commands for OpenSSL 🔒"
---

## Faves

[testssl.sh](https://testssl.sh) is the easy-button testing for printing to the console ([GitHub](https://github.com/drwetter/testssl.sh)).

### Print a remote server's SSL certificate to the terminal

```shell
function sslcert() {
  if [ "${1}" = "-h" ]; then
    echo "Usage: sslcert [FQDN]"
    echo "Prints SSL certificate of a remote server to the terminal."
    return
  fi
  echo | \
  openssl s_client -showcerts -servername "$@" -connect "$*":443 2>/dev/null | \
  openssl x509 -inform pem -noout -text
}
```

### Generate a random password

```shell
openssl rand -base64 16
```

---

## FIPS stuff

Cipher checks (swap `HOST:PORT` and `CIPHER` as needed)

- `RC4-MD5` should fail
- `CAMELLIA256-SHA` should fail
- `AES256-SHA` should work

```shell
(echo "GET /" ; sleep 1) | openssl s_client -connect HOST:PORT -cipher CIPHER
```

---

## Verifications

| What | Command |
| --- | --- |
| CSR | `openssl req -text -noout -verify -in CSR.csr` |
| Private key | `openssl rsa -in privateKey.key -check` |
| Certificate | `openssl x509 -in certificate.crt -text -noout` |
| PKCS#12 (.pfx .p12) | `openssl pkcs12 -info -in keyStore.p12` |
| MD5 hashes | (cert) `openssl x509 -noout -modulus -in certificate.crt | openssl md5`<br>(key) `openssl rsa -noout -modulus -in privateKey.key | openssl md5`<br>(CSR) `openssl req -noout -modulus -in CSR.csr | openssl md5` |

---

## Conversions

| from | to | command |
| --- | --- | --- |
| DER (.crt .cer .der) | PEM | `openssl x509 -inform der -in certificate.cer -out certificate.pem` |
| PEM | DER | `openssl x509 -outform der -in certificate.pem -out certificate.der` |
| PKCS#12 (.pfx .p12) | PEM | `openssl pkcs12 -in keyStore.pfx -out keyStore.pem -nodes` |
| PEM | PKCS#12 (.pfx .p12) | `openssl pkcs12 -export -out certificate.pfx -inkey privateKey.key -in certificate.crt -certfile CACert.crt` |

ℹ️ You can add `-nocerts` to only output the private key or add `-nokeys` to only output the certificates.

---

## Manually working with certs

### New private key and CSR

```shell
openssl req \
  -out CSR.csr \
  -new \
  -newkey rsa:4096 \
  -nodes \
  -keyout PrivateKey.key \
  -config req.conf
```

### Generate self-signed certificate

```shell
openssl req \
  -x509 \
  -sha256 \
  -nodes \
  -days 365 \
  -newkey rsa:4096 \
  -keyout privateKey.key \
  -out certificate.crt
```

### Generate CSR for existing private key

```shell
openssl req \
  -out CSR.csr \
  -key privateKey.key \
  -new
```

### Generate CSR based on existing certificate

```shell
openssl x509 -x509toreq \
  -in certificate.crt \
  -out CSR.csr \
  -signkey privateKey.key
```

### Remove passphrase from private key

```shell
openssl rsa \
  -in privateKey.pem \
  -out newPrivateKey.pem
```
