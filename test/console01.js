
var messages = process.argv.slice(2), 
    counter = 0;


var interval = setInterval(function() {
    var msg = messages[counter++];
    process.stdout.write(msg);
    process.stderr.write(msg);
    if (counter >= messages.length ) {
        clearInterval(interval);
        process.exit(0);
    }
}, 10);

