---
title: "Windows things"
excerpt: "Windows, Office, PowerShell, Active Directory, etc."
---

I don't really work much with the Windows ecosystem anymore, so tossing my notes all in one page as I go.

## PowerShell

`cmdlet` is what's native.  Try to use these when scripting.  It's a verbose, MSFT-y named equalivalent to gnu utilities.  It should do exactly one thing and can be chained together to accomplish something bigger.  Some arguments are only available if you use the `cmdlet` form and not the aliases.

> Some aliases are more like the gnu utilities, but not reliably present and can be remapped.  Others are abbreviations of the longer cmdlet names using the capital letters - eg, `Get-ChildItem` is also `gci`.  **But not always!**  `Copy-Item` is `copy` or `cpi`, not `ci`.
{: .prompt-warning}

| What I wanted | PowerShell<br>`cmdlet` | PowerShell<br>aliases |
| --- | --- | --- |
| list contents | `Get-ChildItem` | `dir` `gci` |
| where am i? | `Get-Location` | `pwd` `gl` |
| change directory | `Set-Location` | `cd` `chdir` |
| make directory | `New-Item -ItemType Directory` | `mkdir` |
| remove directory | `Remove-Item -Recurse` | `rmdir` |
| copy file | `Copy-Item` | `copy` `cp` `cpi` |
| move file | `Move-Item` | `move` `mi` `mv` |
| remove file | `Remove-Item` | `del` |
| get file contents | `Get-Content` | `type` `gc` |
| write to file | `Set-Content` | `write` `echo` |
| redirect output to file | `Out-File` | `>` or `>>` |
| who am i? | `whoami` | `whoami` |
| what's running? | `Get-Process` | `ps` (not same output) |

Other handy cmdlets:

- `Get-ComputerInfo` gets a bunch of system info
- `Get-Host` gets some info about the PowerShell host
- `Get-Service` gets info about services (remember services aren't the same in Windows)
- `Get-Environment` gets environment variables
- `GetFileInfo` gets some info about a file like owner, dates, etc.
