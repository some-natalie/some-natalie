---
title: "Static analysis tools"
excerpt: "mostly things I keep forgetting about static code analysis tooling"
---

## CodeQL

Without the magic of running it somewhere else, it's a little more of a pain to get it running locally.  Running on the M3 Mac makes it worthwhile.

- [Official docs](https://codeql.github.com/docs/)
- [Code repo](https://github.com/github/codeql)
- [Better docs](https://appsec.guide/docs/static-analysis/codeql/)

### Basic setup stuff

```shell
# install from homebrew
brew install codeql

# list the languages you can extract (this should be a reasonably large list)
codeql resolve languages
```

### Working with query packs

CodeQL is a query language and there are lots of prewritten queries, bundled into "packs", that can be used w/o learning the language in depth.  On a Mac, they'll tend to be in `~/.codeql/packages`

```shell
# list the query packs you have (probably not much to start)
codeql resolve packs

# directory structure
.codeql/packages
├── codeql
│   ├── javascript-queries
│   │   └── 1.2.0
│   │       ├── AlertSuppression.ql
│   │       ├── AlertSuppression.qlx
│   │       ├── AngularJS
│   │       │   ├── DeadAngularJSEventListener.md
│   │       │   ├── DeadAngularJSEventListener.ql
│   │       │   ├── DeadAngularJSEventListener.qlx

< ... and so on ... >

285 directories, 2171 files

# download new packs
codeql pack download codeql/python-queries
```

### Non-compiled languages

```shell
# create the database by changing
codeql database create codeql.db --language=python

# run the base queries
codeql database analyze codeql.db \
  --format=sarif-latest \
  --output=results.sarif \
  -- codeql/python-queries

# run specific query packs
codeql database analyze codeql.db \
  --format=sarif-latest \
  --output=results.sarif \
  -- codeql/python-queries:codeql-suites/python-security-and-quality.qls
  
# output to CSV instead
codeql database analyze codeql.db \
  --format=csv \
  --output=results.csv \
  -- codeql/python-queries
```

## Semgrep

### Basic setup stuff

```shell
brew install semgrep
```

### Basic scan

```shell
# scan the current directory
semgrep scan . --sarif -o semgrep.sarif

# use the owasp top 10 rules
semgrep scan --config "p/owasp-top-ten" --sarif-output=semgrep.sarif .
```

If it's being weird about resource usage, specify the number of jobs with the `-j` flag - might fix it.
