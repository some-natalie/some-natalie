---
title: "Kodi setup on a Raspberry Pi 4"
date: 2023-10-16
classes: wide
excerpt: "🍿 Movie night, locally"
categories:
  - blog
tags:
  - homelab
---

![popcorn](https://media.githubusercontent.com/media/some-natalie/some-natalie/main/assets/graphics/gifs/popcorn.gif){: .w-30 .left}

One more handy use for a little computer - a local home media server!  Local movie night is relaxing.  It's also great for putting the favorite kid video of the day on repeat ... again and again and again (until the dishwasher is loaded, laundry moved, etc.). 🦈 _baby shark, doo doo doo_ 🦈 🔂

The end product is an "appliance-like" device that can play local media on a television.

## Hardware

You'll need some parts and pieces to build this.

- Raspberry Pi 4 (amount of RAM up to you)
- Micro-SD card (capacity up to you)
- Power supply for the board (15W USB-C)
- Case (strongly recommend a passively cooled case like [this one](https://flirc.tv/products/flirc-raspberry-pi-4-case-silver))
- A big external hard drive w/ an independent power supply (do not draw power from the board) or a network share, for the media to share
- A keyboard (only for initial setup, does not need to be permanently attached)
- A television with HDMI input and a Micro-HDMI cord

## Initial setup

Flash the micro SD card with the latest version of the Raspberry Pi OS - Debian 12 (bookworm), [64-bit lite image](https://www.raspberrypi.com/software/operating-systems/%23raspberry-pi-os-64-bit).  Boot it up and then run `raspi-config`, the [configuration tool](https://www.raspberrypi.com/documentation/computers/configuration.html#raspi-config), to set up at least the following.

- Username and password
- Localization settings
- Console auto-login (what you want in order to automagically start Kodi on boot)
- Network setup, if needed
- Enable SSH (optional)

```shell
sudo raspi-config
```

Run updates to the OS manually, then reboot, before installing more software.

```shell
sudo apt update
sudo apt dist-upgrade
sudo reboot
```

There's a decent chance that there'll be new firmware, drivers, security fixes, etc.  It's now a plain server, ready to install any graphical apps.

> Older guides have you configure more settings in the `/boot/config.txt` file.  Most aren't necessary on the Pi 4 B model with the default OS.  In particular, the `gpu_mem` settings are deprecated in favor of letting the memory management unit (MMU) do what it was designed to.  [Legacy config.txt options](https://www.raspberrypi.com/documentation/computers/legacy_config_txt.html%23gpu_mem) is the official documentation on this if you're looking for some light reading.  I did _no_ configuration changes apart from what's in this guide and it works fabulously.
{: .prompt-info}

## Kodi installation

Install Kodi and the desktop manager for it to use.

```shell
sudo apt install kodi lightdm
```

Now have it automatically launch at boot using [systemd](https://systemd.io/).  Use `sudo` to create a file at `/lib/systemd/system/kodi.service` with the following contents:

```systemd
[Unit]
Description = Kodi Media Center
After = remote-fs.target network-online.target
Wants = network-online.target

[Service]
User = pi
Group = pi
Type = simple
ExecStart = /usr/bin/kodi-standalone
Restart = on-abort
RestartSec = 5

[Install]
WantedBy = multi-user.target
```
{: file='/lib/systemd/system/kodi.service'}

Note you will need to edit the `user` and `group` to match the username you created.  Enable the service to start Kodi automatically at boot:

```shell
sudo systemctl enable kodi.service
```

Then reboot and configure Kodi as you'd like.  Here's the official [quick start guide](https://kodi.wiki/view/Quick_start_guide) to get going.  My post-install configuration includes

- Adding the movie, TV, and music directories from an external hard drive to the library ([wiki](https://kodi.wiki/view/Video_library))
- Setting up [Kore](https://kodi.wiki/view/Official_Kodi_Remote), the official remote app for phones/tablets
- Configuring a [weather add-on](https://kodi.wiki/view/Weather) to see the local weather

## Maintenance

Under the hood, it's a lightweight general-purpose Linux machine that's likely connected to the internet.  It needs regular security updates, outlined in the [official docs](https://www.raspberrypi.com/documentation/computers/os.html#using-apt) with handy videos and tutorials.

![stig-popcorn](https://media.githubusercontent.com/media/some-natalie/some-natalie/main/assets/graphics/gifs/stig-popcorn.gif){: .w-30 .right}

The chance of me remembering to do this regularly is about zero, so I've automated it using the same method in last week's post - [Self-updating build servers, automatically](../diy-updates-on-runners/).  The machine is joined to a GitHub repository as a self-hosted runner ([directions](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/adding-self-hosted-runners)) and runs a workflow to update it automatically 🪄 ([this one](https://github.com/some-natalie/some-natalie/blob/main/.github/workflows/update-kodi.yml), to be exact).  Now no one will need to remember to keep it securely up to date and it'll yell (create an issue) if something doesn't go exactly right.

🎞️ Enjoy home movie night ... or simply keep small humans distracted for a few minutes while groceries are put away. 🧸

---

## Footnotes

Yes, this really was written for me.  I'd upgraded the hardware, then the software from Buster to Bookworm, and then random crashes started happening.  Rather than troubleshoot and search forums for hours to figure out all the possible problematic changes after years of this Just Working, I rebuilt it and wrote it down for future me.  Hope someone else searching finds it useful too.
