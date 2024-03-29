---
title: "OpenSSL cheatsheet"
excerpt: "tl;dr commands for OpenSSL 🔒"
---

Print a remote server's SSL certificate to the terminal

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

🌟 Generate a random password

```shell
openssl rand -base64 16
```

## Manually working with certs

New private key and CSR

```shell
openssl req -out CSR.csr -new -newkey rsa:4096 -nodes -keyout PrivateKey.key -config req.conf
```

Generate a self-signed certificate

```shell
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:4096 -keyout privateKey.key -out certificate.crt
```

Generate a certificate signing request (CSR) for an existing private key

```shell
openssl req -out CSR.csr -key privateKey.key -new
```

Generate a certificate signing request based on an existing certificate

```shell
openssl x509 -x509toreq -in certificate.crt -out CSR.csr -signkey privateKey.key
```

Remove a passphrase from a private key

```shell
openssl rsa -in privateKey.pem -out newPrivateKey.pem
```

## Verifications

Check a Certificate Signing Request (CSR)

```shell
openssl req -text -noout -verify -in CSR.csr
```

Check a private key

```shell
openssl rsa -in privateKey.key -check
```

Check a certificate

```shell
openssl x509 -in certificate.crt -text -noout
```

Check a PKCS#12 file (.pfx or .p12)

```shell
openssl pkcs12 -info -in keyStore.p12
```

Check an MD5 hash of the public key to ensure that it matches with what is in a CSR or private key

```shell
openssl x509 -noout -modulus -in certificate.crt | openssl md5
openssl rsa -noout -modulus -in privateKey.key | openssl md5
openssl req -noout -modulus -in CSR.csr | openssl md5
```

## Conversions

Convert a DER file (.crt .cer .der) to PEM

```shell
openssl x509 -inform der -in certificate.cer -out certificate.pem
```

Convert a PEM file to DER

```shell
openssl x509 -outform der -in certificate.pem -out certificate.der
```

Convert a PKCS#12 file (.pfx .p12) containing a private key and certificates to PEM

```shell
openssl pkcs12 -in keyStore.pfx -out keyStore.pem -nodes
```

Convert a PEM certificate file and a private key to PKCS#12 (.pfx .p12)

```shell
openssl pkcs12 -export -out certificate.pfx -inkey privateKey.key -in certificate.crt -certfile CACert.crt
```

ℹ️ You can add `-nocerts` to only output the private key or add `-nokeys` to only output the certificates.
