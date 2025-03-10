---
title: "Linux commands"
excerpt: "mostly evergreen sysadmin things"
---

## Resources

- [GTFObins](https://gtfobins.github.io/) is a handy list of capabilities by binary.

## List all open files by process

```shell
# What processes have open files?
function openfiles {
  if [ "${1}" = "-h" ]; then
    echo -e "Usage: openfiles [r|w|m|R|W] regex\n    -r    opened for reading or read/write\n    -w    opened for writing or read/write\n    -m    accessed from memory (includes running command)\n    -R    opened for reading only\n    -W    opened for writing only"
    return
  fi
  if [ "$#" = "0" ]; then
    echo "Process signature/regex required."
    return
  fi
  MODE="(w|u)"
  ACTION="for writing"
  if [ "${1}" = "r" ]; then
    MODE="(r|u)"
    ACTION="for reading"
    shift
  elif [ "${1}" = "R" ]; then
    MODE="r"
    ACTION="for reading (only)"
    shift
  elif [ "${1}" = "W" ]; then
    MODE="w"
    ACTION="for writing (only)"
    shift
  elif [ "${1}" = "m" ]; then
    MODE="(txt|mem)"
    ACTION="in memory"
    shift
  elif [ "${1}" = "w" ]; then
    shift
  fi
  if [ "${MODE}" != "(txt|mem)" ]; then
    MODE="[0-9]+${MODE}"
  fi
  PIDS=$(pgrep -d "," -f "${@}")
  if [ "${PIDS}" = "" ]; then
    echo "No processes found matching '${@}'."
    return
  fi
  OPENFILES=$(lsof -PXn -p "${PIDS}" | egrep "${MODE}[A-Za-z]* +REG" | awk '{print $9}' | egrep -v "^\[" | sort | uniq);
  if [ "${OPENFILES}" = "" ]; then
    echo "No files opened ${ACTION}."
  else
    echo "Files opened ${ACTION}:"
    ls -ahl "$OPENFILES"
  fi
}
```

## List all open ports

```shell
# What processes are listening on what ports?
function listening {
  if [ "${1}" = "-h" ]; then
    echo "Usage: listening [t|tcp|u|udp] [ps regex]"
    return
  fi
  DISP="both"
  NSOPTS="tu"
  if [ "${1}" = "t" -o "${1}" = "tcp" ]; then
    DISP="tcp"
    NSOPTS="t"
    shift
  elif [ "${1}" = "u" -o "${1}" = "udp" ]; then
    DISP="udp"
    NSOPTS="u"
    shift
  fi
  FILTER="${*}"
  PORTS_PIDS=$(netstat -"${NSOPTS}"lnp | tail -n +3 | tr -s ' ' | sed -n 's/\(tcp\|udp\) [0-9]* [0-9]* \(::\|0\.0\.0\.0\|127\.[0-9]*\.[0-9]*\.[0-9]*\):\([0-9]*\) .* \(-\|\([0-9-]*\)\/.*\)/\3 \1 \5 \2/p' | sed 's/\(::\|0\.0\.0\.0\)/EXTERNAL/' | sed 's/127\.[0-9]*\.[0-9]*\.[0-9]*/LOCALHOST/' | sort -n | tr ' ' ':' | sed 's/::/:-:/' | sed 's/:$//' | uniq)
  PS=$(ps -eo pid,args)
  echo -e '   Port - Protocol - Interface - Program\n-----------------------------------------------'
  for PORT_PID in ${PORTS_PIDS}; do
    PORT=$(echo "${PORT_PID}" | cut -d':' -f1)
    PROTOCOL=$(echo "${PORT_PID}" | cut -d':' -f2)
    PID=$(echo "${PORT_PID}" | cut -d':' -f3)
    INTERFACE=$(echo "${PORT_PID}" | cut -d':' -f4)
    if [ "${PROTOCOL}" != "${DISP}" -a "${DISP}" != "both" ]; then
      continue
    fi
    if [ "${PID}" = "-" ]; then
      if [ "${FILTER}" != "" ]; then
        continue
      fi
      printf "%7s - %8s - %9s - -\n" "${PORT}" "${PROTOCOL}" "${INTERFACE}"
    else
      PROG=$(echo "${PS}" | grep "^ *${PID}" | grep -o '[0-9] .*' | cut -d' ' -f2-)
      if [ "${FILTER}" != "" ]; then
        echo "${PROG}" | grep -q "${FILTER}"
        if [ $? -ne 0 ]; then
          continue
        fi
      fi
      printf "%7s - %8s - %9s - %s\n" "${PORT}" "${PROTOCOL}" "${INTERFACE}" "${PROG}"
    fi
  done
}
```

## Compress files with progress

This uses `pigz` ([link](https://zlib.net/pigz/)) for multithreaded compression and `pv` ([man page](https://linux.die.net/man/1/pv)) to show progress.

```shell
# for a directory
tar cf - /folder-with-big-files -P |\
  pv -s $(du -sb /folder-with-big-files |\
  awk '{print $1}') |\
  pigz --best > big-files.tar.gz

# for a single big file, like a VM HDD
tar cf - vm-image.img -P |\
  pv -s $(du -sb vm-image.img |\
  awk '{print $1}') |\
  pigz --best > vm-image.tar.gz
```

Output looks like this:

```text
18.7GiB 0:03:20 [82.8MiB/s] [======>                               ] 15% ETA 0:34:56
```

## Strings that appears most in log file

```shell
# search
grep -o 'string' file |\
# sort
  sort |\
# deduplicate
  uniq -c |\
# sort by count
  sort -nr |\
# show top 25
  head -n 25

# now in practice for which repos are accessed the most by `git`
grep -o 'repo=[^ ]*' /var/log/babeld/babeld.log |\
  sort |\
  uniq -c |\
  sort -nr |\
  head
```
