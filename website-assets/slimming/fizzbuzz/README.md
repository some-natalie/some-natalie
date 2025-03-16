# fizzbuzz with flask

you found fizzbuzz, written in python for flask to run in a container.  congrats?

to build and run:

```shell
docker build -t fizzbuzz:latest .
docker run -p 5001:5000 fizzbuzz:latest
```

<http://127.0.0.1:5001/> will show you the fizzbuzz page 🎉
