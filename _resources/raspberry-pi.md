---
title: "Raspberry Pi stuff"
excerpt: "various commands and notes and more"
---

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

Sometimes older DVI or VGA monitors don't like HDMI adapters.  They'll show "No signal" or go dormant when the device is online and works on newer monitors.  Editing `/boot/config.txt` to force HDMI hot-plug mode can sometimes help.  Must reboot to apply the setting.

```conf
hdmi_force_hotplug=1
```
{: file='/boot/config.txt'}

🕰️ Check NTP first for all network weirdness.  The lack of a [real-time clock](https://en.wikipedia.org/wiki/Real-time_clock) means that if NTP ever fails (or there's been a power outage), the time drift can knock DNSSEC or other time-dependent services into failure pretty fast.
