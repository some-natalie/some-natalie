---
title: "Raspberry Pi stuff"
excerpt: "various commands and notes and more"
---

> 🕰️ Check NTP first for all network weirdness.  The lack of a [real-time clock](https://en.wikipedia.org/wiki/Real-time_clock) means that if NTP ever fails (or there's been a power outage), the time drift can knock DNSSEC or other time-dependent services into failure pretty fast.
{: .prompt-tip }

## Shell aliases

Print the temperature in Fahrenheit (looks like this `CPU Temp: 102°F`)

```shell
function pi-temp {
  /usr/bin/vcgencmd measure_temp |\
  awk -F "[=']" '{print($2 * 1.8)+32}' |\
  awk -F "." '{print $1}' |\
  echo "CPU Temp: $(cat)°F"
}
```
{: file='~/.bashrc'}

## Video

Sometimes older DVI or VGA monitors don't like HDMI adapters.  They'll show "No signal" or go dormant when the device is online and works on newer monitors.  Editing `/boot/config.txt` to force HDMI hot-plug mode can sometimes help.  Must reboot to apply the setting.

```conf
hdmi_force_hotplug=1
```
{: file='/boot/config.txt'}

## Audio

🔉 For some reason, the [kiddo pi desktops](../../blog/kiddo-pi) sometimes lose the sound device.  When this happens, `raspi-config` shows no sound systems or devices and `pulseaudio` seems to have disappeared.  This has fixed it a couple times now.

```shell
# reinstall pulseaudio, then reboot
sudo apt reinstall pulseaudio
sudo reboot

# make sure it's using HDMI 0 for audio and pulseaudio shows up as an audio system
sudo raspi-config

# what's another reboot?
sudo reboot

# huh, no noise still ... run this and mess with the physical volume buttons
speaker-test
```

While I'm not using Arch, their [wiki page on pulseaudio](https://wiki.archlinux.org/title/PulseAudio) has great examples.  This blog post on [pulseaudio under the hood](https://gavv.net/articles/pulseaudio-under-the-hood/) is good for explaining how it puts it all together for audio on Linux.
