

process.stdin.on('data',function (v) {
    process.stdout.write(v.toString());
});