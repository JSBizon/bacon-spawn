"use strict";

var UTIL = require('util'),
    spawn = require('child_process').spawn;

function normalizeArguments(command /*, args, options*/) {
    var args, options;

    if (Array.isArray(arguments[1])) {
        args = arguments[1].slice(0);
        options = arguments[2];
    } else if (arguments[1] !== undefined && ! UTIL.isObject(arguments[1])) {
        throw new TypeError('Incorrect value of args option');
    } else {
        args = [];
        options = arguments[1];
    }

    if (options === undefined) {
        options = {};
    }
    else if (! UTIL.isObject(options)) {
        throw new TypeError('options argument must be an object');
    }

    return {
        cmd: command,
        args: args,
        options: options
    };
}

function factory(Bacon, command /*, args, options*/) {
    if (arguments.length < 2) {
        throw new Error("Requred minimum 2 arguments");
    }
    var args_array = Array.prototype.slice.call(arguments);
    args_array.shift();
    var args = normalizeArguments.apply(null, args_array);
    //args.options.stdio = ['pipe', 'pipe', 'pipe'];

    var stdio_closed = false,
        process_exit = false,
        process = spawn(args.cmd, args.args);

    var process_stream = Bacon.fromBinder(function(sink) {

        process.stdout.on('data', function (data) {
            sink(new Bacon.Next({
                    type: 'stdout',
                    data: data,
                    process: process,
                })
            );
        });

        process.stderr.on('data', function (data) {
            sink(new Bacon.Next({
                    type: 'stderr',
                    data: data,
                    process: process
                })
            );
        });

        process.on('close', function (code, signal) {
            sink(new Bacon.Next({
                    type: 'close',
                    code: code,
                    signal: signal,
                    process: process
                })
            );
            stdio_closed = true;
            if (process_exit) {
                sink(new Bacon.End());
            }
        });

        process.on('exit', function (code, signal) {
            sink(new Bacon.Next({
                    type: 'exit',
                    code: code,
                    signal: signal,
                    process: process
                })
            );
            process_exit = true;
            if (stdio_closed) {
                sink(new Bacon.End());            
            }
        });

        process.on('error', function (err) {  
            sink(new Bacon.Error({
                    error: err,
                    process: process
                })
            );
        });

        process.on('message', function (message, sendHandle) {
            sink(new Bacon.Next({
                    type: 'message',
                    data: message,
                    sendHandle: sendHandle,
                    process: process
                })
            );
        });

        process.on('disconnect', function () {
            sink(new Bacon.Next({
                    type: 'disconnect'
                })
            );
        });

        return function() {
            process.kill();
        };
    });

    process_stream.connect = function (stdin_stream) {
        stdin_stream.onValue(function (v) {
            if ( ! stdio_closed) {
                process.stdin.write(v);
            }
        });

        stdin_stream.onEnd(function (v) {
            process.stdin.end();
        });

        return process_stream;
    };

    return process_stream;
}

module.exports = factory;
