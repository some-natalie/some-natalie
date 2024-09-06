---
title: "Corporate proxies, meddler-in-the-middle attacks, and git"
date: 2024-09-05
excerpt: "Malicious wireless access point or corporate security proxy?  Git can't tell the difference."
tags:
- business
- questionable-ideas
- git
- security
---

While waiting for my delayed flight, I figured it would be fun to dive into a new project to pass the time.  After connecting to the airport WiFi, I tried cloning the public repository.  That’s when I found ~~an old friend~~ very familiar error messages telling me something was amiss - a TLS connection error.

```shell-session
error: RPC failed; curl 56 GnuTLS recv error (-110): The TLS connection was non-properly terminated
```

A different git client gave me similarly unhelpful feedback:

```shell-session
error: RPC failed; curl 56 Recv failure: Connection was reset
error: 2269 bytes of body are still expected
fetch-pack: unexpected disconnect while reading sideband packet
fatal: early EOF
fatal: fetch-pack: invalid index-pack output
```

While frustrating, at least I've seen this one before.  Switching to SSH didn't help either, as it appears SSH is blocked - `ssh: connect to host github.com port 22: Connection timed out fatal: Could not read from remote repository.` ([full logs](/assets/logs/casb-git/git-logs.txt))

Let's demystify this error message! 🕵🏻‍♀️

## What happened?

![casbs-explained](/assets/graphics/memes/casb-explained.jpg){: .w-50 .shadow .rounded-10 .right }

**Git is failing because secure traffic between the client and the server isn't possible.**

TLS is a cryptographic protocol that ensures secure and private communication between two parties[^tls].  When the connection is terminated unexpectedly, it's usually because the data was tampered with or the connection was interrupted.  Rather than continue with a potentially compromised connection, git aborts the operation.

In my prior roles working with developers in security-conscious enterprises, I saw this error message all the time.  It's a common problem when a Cloud Access Security Broker[^examples] (CASB) is used and the configuration isn't applied correctly on the endpoints.  These programs intercept and inspect network traffic, potentially logging sensitive information, editing the data sent/received, or blocking access entirely.

It's supposed to ensure that only approved software services are used and prevent sensitive data from being leaked.  They do this by routing all network traffic through a proxy and having a cryptographic certificate installed on each endpoint (laptop, server, anything else) to allow that proxy to inspect the traffic efficiently.  Functionally, it is no different than opening someone else's mail to read it before resealing it and passing it along.

Turns out I'd connected to a spoofed (not the right) wireless network at the airport.  It could have been malicious or mischievous, but it was definitely trying to snoop on my encrypted communications.  When the endpoint doesn't trust who is trying to break the traffic, **most secure protocols will fail instead of continuing with a potentially compromised connection**.

> Git can't tell the difference between script kiddies running spoofed wifi and billion dollar enterprise security ~~theater~~ applications.  **They both do the _exact_ same inspection in the _exact_ same way.**
{: .prompt-warning }

## How to fix it

I've seen this error message so many times not because there are tons of malevolent wireless access points, but because this software is so common in my world and configuring it correctly with git can be tricky.

Many operating systems or Linux distributions use [GnuTLS](https://www.gnutls.org/) as the SSL backend for git, which is bundled in at compilation.  Most CASB software documentation is written for and deployment scripts assume that everything is using [OpenSSL](https://openssl.org/) or Microsoft's [Schannel](https://learn.microsoft.com/en-us/windows-server/security/tls/tls-ssl-schannel-ssp-overview).  I previously wrote on how git can be configured by project, by user, or globally in [git configurations during a code audit](../git-config-audits).  Because of this distributed flexibility, the number of ways to misconfigure it at an enterprise scale is nearly infinite.

Assuming that you're at a company that is intercepting their network traffic lawfully (and not a compromised network), there are a few things that can fix this.

### Configure it

First, make sure that the certificate used by the CASB is installed on the machine.  If you're not on the team responsible for configuring the interception, you may need to get them to do this and/or provide you the certificate to install.  Then, configure git to use it with `git config --global http.sslCAinfo "/path/to/your/certificate.crt"`.  This explicitly sets the certificate to trust the connection despite the break/inspect proxy, which is usually all that needs to be done.

If it still isn't working, you may need to set the SSL backend to something that the intercept proxy supports - usually OpenSSL or Schannel.  Because of how much depends on your environment - especially the intersection of which version of git is used, where it's installed, if it sees the operating system's certificate store, and the proxy and platform configurations - it's hard to give specific commands that will _definitely work for you_.  Spend some time reading up on [git configuration](https://git-scm.com/book/en/v2/Customizing-Git-Git-Configuration) in general and the [documentation](https://git-scm.com/docs/git-config#Documentation/git-config.txt-httpsslBackend) of that setting specifically.  The command to do that for OpenSSL is `git config --global http.sslBackend openssl` - works if it's a handful of machines, but if there are more, using a configuration file is simpler.  Naturally, it'll assume that OpenSSL is installed and available on the target system.

If these are persistent machines, something like [Ansible](https://www.ansible.com/) or [Puppet](https://puppet.com/) should manage this setting at scale.  On the Windows side, most shops already have [Microsoft Endpoint Manager](https://docs.microsoft.com/en-us/mem/configmgr/core/understand/introduction) (formerly known as SCCM) or similar tool that can be leveraged to push this change out.  For ephemeral environments (such as containers), add the certificate and the git configuration file to the files used to build your image.

This setting and the usage of an intercept proxy should be completely transparent to the end users.

### Rolling your own doesn't make life better

![patch-that-doesnt-end](https://media.githubusercontent.com/media/some-natalie/some-natalie/main/assets/graphics/gifs/patch-that-doesnt-end.gif){: .shadow .rounded-10 .left }

Should that not work, the harder option is to compile git from source.  Don't do this one without guidance from the proxy's vendor - it's probably not worth the effort and the risk involved.

**This is risky** because it introduces another piece of software for your teams to maintain internally.  Rebuilding something routinely to update vulnerabilities in git and the SSL backend and all other dependencies is necessary and unrewarding work.  This work is avoided by using your distribution's binaries.  In my experience, bespoke builds like this get neglected quickly - usually for human reasons like project staff turnover or realignment.

It also introduces the risk of **cryptography misconfiguration**.  Your teams simply need to know _more_ about compilers, about each dependency, and about the cryptography backend you're using.  None of these are insurmountable obstacles, but they are deeply technical and likely unrelated to the business goals of your team.

Here's an [example](https://github.com/paul-nelson-baker/git-openssl-shellscript/blob/main/compile-git-with-openssl.sh) of doing this, but everyone should definitely read the git documentation on the building from source ([here](https://github.com/git/git)), specifically the directions for [installation](https://github.com/git/git/blob/master/INSTALL), to go down this path.

### Change protocols

The option that may or may not work is to use SSH instead of HTTPS.  Some companies allow this and some don't.  Some implementations of intercept proxies have an ability to inspect SSH traffic, some don't.  All SSH traffic is typically blocked by default in most clients I've worked with - it's worth a try, but don't be surprised if it also doesn't work.  🤷🏻‍♀️

### A very common bad idea

![google-light](/assets/graphics/2024-09-06-casb-mitm-git/google-ai-light.png){: .w-50 .shadow .rounded-10 .right .light }
![google-dark](/assets/graphics/2024-09-06-casb-mitm-git/google-ai-dark.png){: .w-50 .shadow .rounded-10 .right .dark }

The very common and bad idea is to disable SSL verification.  It's also the first suggestion that pops up on StackOverflow or other searches.  As shown on the right, AI is also garbage-in-garbage-out with this terrible idea.

You can do this with `git config --global http.sslVerify false` or editing the configuration file directly.  In lacking specific guidance on **not** doing this and how to enable OpenSSL or move to SSH instead, users do this anyway because it's among the first suggestions that pop up.  It's understandable as teams just want to do their job and this error message was in the way of that, but leads to poor security posture and should be discouraged.

Once something works, the chance of a user going through a process to later undo something or troubleshoot further is basically nil.  If your users notice the proxy, someone has _definitely_ done this somewhere.  I'll talk on how to find and correct this at scale later, perhaps.

### An even worse idea

😈 So there's one more creatively awesome way to disable SSL certificate verification by using `LD_PRELOAD` to forcibly accept any interceptions or meddling of the SSL connection[^ldpreload].  There's a fantastic little library named [`libleakmydata`](https://github.com/DavidBuchanan314/libleakmydata) that does exactly this.  Please note the name ... but I can't say that I _haven't_ used it before to make a point.

Much like the suggestion on disabling verification with git configuration, this is something that can be set without administrator rights by a local user on a per-project basis.  As a positive, at least it limits the scope of where trust is disabled.  Doing either of these will allow both your corporate proxy and any meddlers-in-the-middle to intercept and read all of your git traffic - including perhaps my password to my account, the code I'm working on, and the code I'm sending back.

### Don't use inspection proxies

These errors disappear when the break-and-inspect proxy is removed or disabled.  Not using it and relying on other controls for data loss prevention or SaaS governance is a totally valid option.  It's also the least likely to happen in my experience.

## Parting thoughts

Cloud access security brokers and other "break-and-inspect" proxies are functionally identical to meddler-in-the-middle attacks.  If these solutions aren't configured correctly, they appear no different than a naughty airport wifi spoof attack.  When these misconfigurations are noticed by users, the path of least resistance is to do something terribly unsafe - disable SSL verification entirely.  Because [git configuration is local](../git-config-audits/#order-of-operations), your endpoint security team may not even know this is happening.  Developer data continues to be intercepted as expected, just by literally anyone and not _only_ your corporate proxy.

---

## Footnotes

[^examples]: Examples of CASBs include [Netskope](https://www.netskope.com/), [zScaler](https://www.zscaler.com), and [Microsoft Defender for Cloud Apps](https://www.microsoft.com/en-us/security/business/siem-and-xdr/microsoft-defender-cloud-apps).  Most "enterprise security" type companies have a CASB offering these days.
[^tls]: More about Transport Layer Security from [Wikipedia](https://en.wikipedia.org/wiki/Transport_Layer_Security) and in plain English from [The Internet Society](https://www.internetsociety.org/deploy360/tls/basics/).
[^ldpreload]: `LD_PRELOAD` is a way to load a shared library before any other shared libraries.  It's powerful for debugging, changing behavior in weird edge cases, and for malicious purposes.  [Wikipedia](https://en.wikipedia.org/wiki/Dynamic_linker#Systems_using_ELF) has a decent writeup.  I was going to write about how much I love it, but found ✨ [this amazing blog](https://blog.jessfraz.com/post/ld_preload/) ✨ that does it better than I ever could.
