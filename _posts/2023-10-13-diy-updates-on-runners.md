---
title: "Self-updating build servers, automatically"
date: 2023-10-13
tags:
  - homelab
  - questionable-ideas
  - github-actions
categories:
  - blog
classes: wide
excerpt: "Remarkably helpful automation to update your own CI servers"
---

🎃 It’s Friday the 13th - let’s talk questionable, but effective, ideas 👻

Your build infrastructure can update itself using your own CI tooling.  It's easier and _way_ better than it sounds, especially at scales that don't justify hiring dedicated teams of engineers to run it.  Hear me out ... 

No one will argue that keeping your infrastructure up to date is important to your company's security posture.  Yet, I've noticed this is a common oversight for build servers _specifically_.[^build]

It's way less risky to simply update everything on these machines from the default repositories for that OS, then reboot, once a week (ish).  To the folks mad at that suggestion, please head to the footnotes[^fix].  With big fleets of infrastructure, this gets done with tools designed to do _exactly_ that task - [Ansible](https://www.ansible.com/), [Puppet](https://www.puppet.com/), [Red Hat Satellite](https://www.redhat.com/en/technologies/management/satellite), etc.  These tools are great for teams that have invested time and energy into building and maintaining them, but ...

🤔 What if you need something a little simpler?

## Self-updating CI servers

Running OS updates on my self-hosted runners using GitHub Actions itself is surprisingly effective.[^github]  Here’s the workflow jobs ([full file](https://github.com/some-natalie/some-natalie/blob/main/.github/workflows/update-kodi.yml)) with the `runs-on` target changed out:

```yaml
apt-updates:
  runs-on: (target tag)
  steps:
    - name: Update the apt cache
      shell: bash
      run: |
        sudo apt clean
        sudo apt update

    - name: Run all package updates
      shell: bash
      env:
        DEBIAN_FRONTEND: noninteractive
      run: sudo apt dist-upgrade -y

    - name: Reboot
      shell: bash
      run: sudo shutdown -r +1 "Rebooting ... brb"

wait:
  name: wait for 5 minutes
  runs-on: ubuntu-latest # using GitHub's hosted runners here, just can't be the tag that updated for self-hosted only environments
  needs: [apt-updates]
  steps:
    - name: wait for 5 minutes
      shell: bash
      run: sleep 300
    
check-its-back-up:
  runs-on: (target tag)
  name: Verify everything is back up and online
  needs: [wait]
  steps:
    - name: Verify we're back online and have rebooted less than 10 minutes ago
      shell: bash
      run: |
        secs="$(awk '{print $1}' /proc/uptime | sed 's/\.[^\.]*$//')"
        if [ "$secs" -lt 600 ]; then
          echo "System rebooted less than 10 minutes ago"
          exit 0
        else
          echo "System rebooted more than 10 minutes ago"
          exit 1
        fi
```

This is surprisingly good!  Staying on the latest updates within [Raspberry Pi OS](https://www.raspberrypi.com/software/) (or any Debian or Ubuntu based system) is now boring, easy, and automated.  I get to leverage the fact that the upstream developers put a ton of time and testing into packaging their software and it’s one more chore I don’t have to do.

For the Red Hat based distributions, it’d only change a little to look more like 👇 for updates.

```yaml
dnf-updates:
  runs-on: (target tag)
  steps:
    - name: Update using dnf (or yum)
      shell: bash
      run: |
        sudo dnf clean all
        sudo dnf update -y
```

## Let’s handle failures

It isn’t much harder to notify on failure.  If any of the steps above fail, this will create an issue in the repo that controls these runners.  You can of course create more complex logic like assign it to a team, add comments, and more ([docs](https://cli.github.com/manual/gh_issue_create) to do all that).

{% raw %}
```yaml
create-failure-issue:
  name: Create an issue on failure of any step to investigate
  runs-on: ubuntu-latest # use GitHub hosted runners
  if: ${{ failure() }}
  permissions:
    contents: read
    issues: write
  steps:
    - name: Create failure issue
      shell: bash
      run: |
        gh issue create -R some-natalie/some-natalie \
          --title "Update on pihole failed" \
          --body "Please investigate!"
```
{% endraw %}

## Handy tasks to include

🧰 Don't be limited to operating system updates.  Throwing manual tasks into `cron` is one of the oldest tools in the sysadmin toolbox.  Here's a couple more examples:

Clearing the local Docker cache of images not in use is handy from time to time.  This is particularly helpful on self-hosted Dependabot runners, as those tend to be VMs and also tend to be large containers that change on each GHES upgrade.[^d]

```yaml
    - name: Clear the docker cache
      shell: bash
      run: docker system prune -a
```

I run a local DNS and DHCP server using [Pi-hole](https://pi-hole.net/) for blocking ads across my home network.  Keeping that up to date has one more step to check for new software or blocklists.

```yaml
    - name: Update pihole
      shell: bash
      run: |
        sudo pihole -up
        sudo pihole -g
```

## Strengths

It's easy, automated, and audited.  No one has to SSH into machines and do things manually like a barbarian.

It's one less tool to manage (if you're already needing to self-host your compute).

It can notify on failure (also likely one less tool to manage).

And it's entirely undramatic. 🥱

Here's [an example](https://github.com/some-natalie/some-natalie/actions/workflows/update-pihole.yml) of boring updates and reboots happening without anyone caring or noticing for weeks:

![light](/assets/graphics/2023-10-13-diy-updates-on-runners/light.png){: .light .w-75 .shadow .rounded-10}
![dark](/assets/graphics/2023-10-13-diy-updates-on-runners/dark.png){: .dark .w-75 .shadow .rounded-10}

## Limitations

![fridaythe13th](https://media.githubusercontent.com/media/some-natalie/some-natalie/main/assets/graphics/gifs/fridaythe13th.gif){: .w-50 .right}

🎃 Not as spooky as we thought for Friday the 13th, right?  You can even continue to gate updates through your internal repo mirrors, just ... keep those up to date too, please. 🥺

Obviously, this is for persistent VMs or bare metal compute only.  Ephemeral (usually container-based) runners don’t have any of these concerns, as updates happen on building a new image.

There’s also none of the enterprise fleet management niceness that I’m used to - no rollbacks, phased deployments, state management, etc.  I wouldn’t recommend using this at large scale, but this has worked fabulously for a home lab.  It would work quite well for labs, most build farms, and other “easy to overlook” environments in the enterprise too.

---

## Disclosure

I work at GitHub as a solutions engineer at the time of writing this.  All opinions are my own.

## Footnotes

[^build]: I still don’t know why this is, but my guess is that different teams are responsible for the dev/test/production environments versus build servers to put things into that promotion path.  If you have a better idea, lemme know?
[^fix]: Particular needs around complex software should be met with investing in robust regression and acceptance tests, observability, and deployment logic for the applications on top _rather_ than living in fear of the next inevitable CVE.  This requires some level of engineering discipline to maintain the application, the dependencies, and such ... but it _also_ prevents the sheer terror of rebooting a machine that has 1000+ days of uptime.  If the thought of running `yum update -y && reboot` on a Friday scares you, 💓 **fix that** 💓
[^github]: This should work equally well for any other bare metal or VM-based compute in other CI systems - GitLab, Azure DevOps, etc., all have the ability to schedule jobs.  I have used this approach with Jenkins in a prior job and it's quite serviceable.  The [code](https://github.com/some-natalie/some-natalie/tree/main/.github/workflows) for these jobs is all public in GitHub, so continuing to minimize tool sprawl for things Not My Job is ideal.
[^d]: More about that in the [official docs](https://docs.github.com/en/enterprise-server@3.10/admin/github-actions/enabling-github-actions-for-github-enterprise-server/managing-self-hosted-runners-for-dependabot-updates) or if you’re using Red Hat (or derivative) VMs instead here - [Dependabot on Red Hat Enterprise Linux using Docker](../dependabot-on-rhel-docker/).
