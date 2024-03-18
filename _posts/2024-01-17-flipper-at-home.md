---
title: "Flipper Zero saves the holidays (and other personal fun)"
date: 2024-01-17
excerpt: "Personal uses for the internet's favorite cybernetic dolphin companion. 🐬"
tags:
  - security
  - homelab
---

My [Flipper Zero](https://flipperzero.one/) hasn't left my side since I got it last summer - it's earned a spot in my laptop bag for how handy it is at work and at home.  Here's how it saved some headaches over the holidays. 🎄

![home-screen](/assets/graphics/2024-01-17-flipper-at-home/passport.png){: .shadow .rounded-10}
_it's my best friend some days_

## Clone all the remote controls

Clone _all_ the remotes.  All of them, as fast as you can - batteries mysteriously go missing to power toys at Christmas and remotes get misplaced all the time.  Having a built-in spare for anything comes in handy to change the ceiling fan speed, turn off the TV, and subtly lower the volume when it gradually creeps too loud. 🔊

There are two widely-used varieties of remotes, infrared and sub-GHz.

### Infrared remotes

These are most common and rely on a line of sight between the remote and the device.  More about that in the [documentation](https://docs.flipper.net/infrared).  Under the hood, IR files are plain text files.  Here's part of [the code to a Lego train](https://github.com/logickworkshop/Flipper-IRDB/blob/main/Toys/LEGO/Lego_Train.ir) set:

```config
Filetype: IR signals file
Version: 1
#
# IR Remote for Lego Train
# 
name: Stop
type: raw
frequency: 38000
duty_cycle: 0.330000
data: 175 1029 178 263 177 263 177 264 176 265 180 262 178 553 177 264 181 261 174 557 178 263 177 264 176 265 180 260 175 267 178 555 180 535 179 100783 178 1026 181 260 175 266 179 262 178 262 178 264 181 551 174 266 179 263 177 555 175 265 180 261 179 288 173 242 177 265 175 557 178 537 178 123667 178 1027 180 552 178 288 173 242 177 264 176 265 180 552 178 262 178
```
{: file='/ext/infrared/legotrain.ir'}

To interact with these devices, there's a couple of options.

1. Search for existing IR files on GitHub, then copy them to your Flipper using the desktop/mobile app, [qFlipper](https://docs.flipper.net/qflipper).
   - Here's a great repository with tons of IR files - [Flipper-IRDB](https://github.com/logickworkshop/Flipper-IRDB)
   - Code search URL for `*.ir` files - <https://github.com/search?q=path%3A*.ir&type=code&ref=advsearch>
2. Clone the remotes, using the [official directions](https://docs.flipper.net/infrared).
3. Brute force it using one of the [universal remotes](https://docs.flipper.net/infrared/universal-remotes).

ℹ️ Saved remotes nest in folders!  This means remotes can have a logical grouping for your home, for visiting family, for your office, etc.  Here's what that looks like on your Flipper's storage.

```config
ext/
├─ infrared/
│  ├─ home/
│  │  ├─ tv.ir
│  │  ├─ ac.ir
│  ├─ office/
│  │  ├─ projector.ir
│  ├─ parents/
│  │  ├─ tv.ir
│  │  ├─ soundbar.ir
│  ├─ legotrain.ir
```

### Sub-GHz remotes

![remote](/assets/graphics/2024-01-17-flipper-at-home/subghz-remote.png){: .shadow .rounded-10 .right}

For sub-GHz remotes (non-line-of-sight), clone it using the sub-GHz app and save each frequency using the [official directions](https://docs.flipper.net/sub-ghz).  Once saved, each button/code is a plain text file.  Here's the code that turns a ceiling fan on to "breeze mode".

```config
Filetype: Flipper SubGhz Key File
Version: 1
Frequency: 304250000
Preset: FuriHalSubGhzPresetOok650Async
Protocol: CAME
Bit: 24
Key: 00 00 00 00 00 75 F3 3A
```
{: file='/ext/subghz/Fan_breeze.sub'}

These don't tend to have an easy "couple buttons on one screen" remote functionality builtsin.  You can make one with an app called [Sub-GHz Remote](https://lab.flipper.net/apps/subghz_remote_ofw) ([GitHub](https://github.com/DarkFlippers/SubGHz_Remote)) for up to 5 frequencies for easier day-to-day use.  Here's an example, using my living room fan.

```config
Filetype: Flipper SubRem Map file
Version: 1
UP: /ext/subghz/Fan_breeze.sub
DOWN: /ext/subghz/Fan_light.sub
LEFT: /ext/subghz/Fan_low.sub
RIGHT: /ext/subghz/Fan_Off.sub
ULABEL: Breeze
DLABEL: Light
LLABEL: Low
RLABEL: Off
```
{: file='/ext/subghz_remote/living_room_fan.txt'}

## Clone the parking pass

Clone the pass to get into the parking garage or gate instead of borrowing a visitor pass (and losing it or forgetting to return it).  Most apartments, condos, and gated communities use something you can easily clone - NFC or sub-GHz.

> Don't try to clone single-family garage door openers or car key signals!  These use "rolling codes" that change on each use, so you risk accidentally bricking the car or garage door opener and/or requiring expensive manufacturer maintenance.  More about that from [Reddit](https://www.reddit.com/r/flipperzero/comments/18ybru6/introduction_to_rolling_keys/).
{: .prompt-danger}

## Share the wifi

### QR code

To share wifi (or anything) using a QR code, you'll need to install the [QRCode app](https://lab.flipper.net/apps/qrcode) ([GitHub](https://github.com/bmatcuk/flipperzero-qrcode)) on your Flipper and then create a file on the SD card describing what to display.

The general format for sharing wifi is `WIFI:S:<SSID>;T:<WEP|WPA|blank>;P:<PASSWORD>;H:<true|false|blank>;;` so here's an example:

```config
Filetype: QRCode
Version: 0
Message: WIFI:S:testwifi;P:passwordGOEShere;T:WPA;H:false;;
```
{: file='/ext/qrcodes/home_wifi.qrcode'}

Once created, move it to the `/ext/qrcodes/` directory and launch the app to select the code to display.

![qrcode](/assets/graphics/2024-01-17-flipper-at-home/qrcode.png){: .shadow .rounded-10}
_qrcode to connect to the "testwifi" network defined above_

### NFC

For this one, you'll need an extra app to encode data as NFC.  There's a bunch out there.  I used [NFC tools](https://www.wakdev.com/en/apps.html) to create a record of the wifi SSID and password.

From here, we need to add a "virtual" NFC card into the Flipper Zero following [these directions](https://docs.flipper.net/nfc/add-manually).  I used the `NTAG216` type, since it's recommended to be widely compatible with most smartphones.  Save the virtual card, then select "emulate" it on the Flipper while selecting "write tag" on the phone.

![flipper-sending-nfc](/assets/graphics/2024-01-17-flipper-at-home/emulatingnfc.png){: .shadow .rounded-10}

Touch it to the back of a phone and it'll pop up with something like this:

![phone-connecting](/assets/graphics/2024-01-17-flipper-at-home/phone-connect.png){: .shadow .rounded-10 .w-50}

## Take pictures together

📸 The bluetooth connectivity on your Flipper can be used to trigger cameras!  [Bluetooth trigger](https://lab.flipper.net/apps/bt_trigger) ([GitHub](https://github.com/xMasterX/all-the-plugins/blob/-/apps_source_code/bluetooth-trigger)) can control compatible cameras and smartphones for group pictures without an extra remote or running back and forth setting the timer.

More sophisticated cameras use infrared for shutter release.  [IR intervalometer](https://lab.flipper.net/apps/ir_intervalometer) ([GitHub](https://github.com/Nitepone/flipper-intervalometer)) gives more complex controls for timing, bursts of pictures, and more.

## Stay in touch

A personal contact card is helpful to share links to family photo albums, contact info, and more.  It's the exact same process as sharing the wifi above, just with other information written on the NFC tag or QR code.

For QR codes, a simple example file for sharing a single URL is below.

```config
Filetype: QRCode
Version: 0
Message: https://github.com/some-natalie
```
{: file='/ext/qrcodes/github_profile.qrcode'}

Substitute in your family photo album or group chat URL, etc., as needed of course! 💓

This results in another simple QR code to share.  I'd recommend against trying to share a lot of info in a QR code on the Flipper given the limited display space it has to work with.

## An extra hotel keycard

![roomservice](/assets/graphics/2024-01-17-flipper-at-home/iwantroomservice.png){: .w-50 .shadow .rounded-10 .right}

Most hotel key cards are NFC as well, which is handy while traveling with small humans who think all cards are the ⭐ coolest toy **EVER!** ⭐  While most hotels will just give you another one, it's nifty to have a spare already when the kids disappear their new toys before you're done with them.

ℹ️ This is the equivalent of creating another card at the front desk.  You're not getting into anyone else's room with this unless hotel security has _seriously_ fucked up by giving the exact same code to multiple guests at the same property at the same time.

## BadUSB for good

Flipper can execute scripts without interaction from humans, making it great at doing chores like running Windows updates, enabling/updating Windows Defender, and other boring sysadmin-on-holidays tasks.  A quick search of [Ducky script](https://docs.hak5.org/hak5-usb-rubber-ducky/duckyscript-tm-quick-reference) repos didn't turn up anything beyond script kiddy mischief, but this capability has some tremendous power to make running basic updates across a bunch of systems much simpler if you tend to get roped into that sort of thing at family gatherings.

The SD card within your Flipper can be used as a mass storage device over USB ([app link](https://lab.flipper.net/apps/mass_storage) and [GitHub](https://github.com/flipperdevices/flipperzero-good-faps/tree/dev/mass_storage)).  It's handy for small scripts, but that's about it.  Each image is limited to 64 MB.  Don't do it unless you can't find a faster storage.  It is slow, battery-optimized storage by design.

## No can do

Sadly, there are some holiday tasks the Flipper Zero simply cannot help you with. 🙄

- It can mute the television, but it will not prevent questions on when you're getting married, having kids, losing weight, finishing school, etc.
- Do whatever random YouTube videos show for "hax0ring things" with it.
- Impress children - they don't recall [Tamogotchi pets](https://en.wikipedia.org/wiki/Tamagotchi?wprov=sfti1) or [Johnny Mnemonic](https://www.imdb.com/title/tt0113481/).

The Flipper Zero lives up to the hype of utility and exploration of the wireless world around us.  That's quite the accomplishment, given that [it's a fish](https://www.youtube.com/watch?v=F7OM59U4-z0). 🐬

![dolphin](/assets/graphics/2024-01-17-flipper-at-home/dolphin.png){: .shadow .rounded-10}
