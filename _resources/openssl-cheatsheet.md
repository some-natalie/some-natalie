---
title: "OpenSSL cheatsheet"
excerpt: "tl;dr commands for OpenSSL 🔒"
---

## Faves

🩷 [testssl.sh](https://testssl.sh) is the easy-button testing for printing to the console ([GitHub](https://github.com/drwetter/testssl.sh)).

### Print a remote server's SSL certificate

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

### Randomness

```shell
# a long password
openssl rand -base64 32

# mac address
openssl rand -hex 6 | sed 's/\(..\)/\1:/g; s/:$//'
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
| All local ciphers | `openssl ciphers -v` |

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

### Certificate chain order

The order and the lack of whitespace is important!  I always mess this up.

```conf
-----BEGIN CERTIFICATE-----
(Your Primary SSL certificate: your_domain_name.crt)
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
(Your Intermediate certificate: DigiCertCA.crt)
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
(Your Root certificate: TrustedRoot.crt)
-----END CERTIFICATE-----
```

### New private key and CSR

```shell
openssl req \
  -out CSR.csr \
  -new \
  -nodes \
  -keyout PrivateKey.key \
  -config csr.conf
```

### Config files

Here's an example configuration for `service.company.com` with subdomains and other SANs for dev/test environments, as well as IP addresses.  SANs are all optional fields, but it's helpful to have multiple domains/subdomains/IPs share a certificate.  ([documentation](https://www.openssl.org/docs/manmaster/man5/config.html))

```conf
[req]
default_bits = 4096
distinguished_name = dn
prompt = no
req_extensions = req_ext

[dn]
C="US"                            # two digit country code
ST="VA"                           # state
L="McLean"                        # city
O="Company Name"                  # organization
OU="Company Division"             # organizational unit
emailAddress="email@company.com"  # contact email
CN="service.company.com"          # common name (FQDN of the cert)

[req_ext]
subjectAltName = @alt_names

[alt_names]
# dev and wildcard subdomain
DNS.0 = dev-service.company.com
DNS.1 = *.dev-service.company.com
# test and explicit subdomains
DNS.2 = test-service.company.com
DNS.3 = web.test-service.company.com
DNS.4 = storage.test-service.company.com
# prod subdomains of main cert
DNS.5 = web.service.company.com
DNS.6 = storage.service.company.com
# ipv4 address
IP.0 = 10.3.3.3
# ipv6 address
IP.1 = 2001:db8::1
```
{: file='~/csr.conf'}

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
