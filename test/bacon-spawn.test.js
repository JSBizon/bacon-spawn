var FS = require('fs'),
    Bacon = require('baconjs'),
    expect = require('expect.js');

var CONSOLE_LOG_01 = __dirname + '/console01.js';
var NOT_FOUND = __dirname + '/not_found.js';
var STDIN_TO_STDOUT = __dirname + '/stdin_to_stdout.js';


function randomValue(max, min) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function randomArray() {
    var resp = [],
        s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\n",
        arr_len = randomValue(10,20);


    for (var i = 0; i < arr_len; i++) {
        var value_len = randomValue(20,50);
        resp.push(new Array(value_len).join().split(',').map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join(''));
    }

    return resp;
}

describe('Test bacon_spawn', function() { 
    var bacon_spawn;

    before(function(done) {
        bacon_spawn = require('../index');
        done();
    });

    describe("#factory", function () { 
        it('should create stream', function () {
            var stream = bacon_spawn(Bacon,'ls', ['-lh', './']);
            expect(stream).to.be.a(Bacon.EventStream);
        });

        it('should not create stream without arguments', function () {
            expect(function(){ bacon_spawn(Bacon); }).to.throwError();
        });
    });

    describe("#stream", function () {
        it('should read stdout', function (done) {
            var error,
                arg_array = randomArray(),
                value = arg_array.join('');

            arg_array.unshift(CONSOLE_LOG_01);
            var stream = bacon_spawn(Bacon, 'node', arg_array);
            stream.endOnError(function(err) {
                    error = err;
                    return true;
                }).filter(function (ev) {
                    return ev.type === 'stdout' ? true : false;
                }).reduce('', function (seed, ev) {
                    return seed + ev.data;
                }).onValue(function (data) {
                    expect(data).to.be(value);
                    if (error) {
                        done(err);
                    } else {
                        done();
                    }
                });
        });

        it('should read stderr', function (done) {
            var error,
                arg_array = randomArray(),
                value = arg_array.join('');

            arg_array.unshift(CONSOLE_LOG_01);
            var stream = bacon_spawn(Bacon, 'node', arg_array);
            stream.endOnError(function(err) {
                    error = err;
                    return true;
                }).filter(function (ev) {
                    return ev.type === 'stderr' ? true : false;
                }).reduce('', function (seed, ev) {
                    return seed + ev.data;
                }).onValue(function (data) {
                    expect(data).to.be(value);
                    if (error) {
                        done(err);
                    } else {
                        done();
                    }
                });
        });

        it('should read stderr and stdout', function (done) {
            var error, i,
                arg_array = randomArray(), value = '';
            
            for (i = 0; i < arg_array.length; i++) {
                value += arg_array[i] + arg_array[i];
            }

            arg_array.unshift(CONSOLE_LOG_01);
            var stream = bacon_spawn(Bacon, 'node', arg_array);
            stream.endOnError(function(err) {
                    error = err;
                    return true;
                }).filter(function (ev) {
                    return ev.type === 'stderr' || ev.type === 'stdout' ? true : false;
                }).reduce('', function (seed, ev) {
                    return seed + ev.data;
                }).onValue(function (data) {
                    expect(data).to.be(value);
                    if (error) {
                        done(err);
                    } else {
                        done();
                    }
                });

        });

        it('should have close event', function (done) {
            var error, i,
                has_close = false,
                arg_array = randomArray();
            
            arg_array.unshift(CONSOLE_LOG_01);
            var stream = bacon_spawn(Bacon, 'node', arg_array);

            var close = stream.filter(function (ev) {
                    return ev.type === 'close' ? true : false;
                });

            close.onValue(function (v) {
                has_close = true;
            });

            close.onEnd(function () {
                if (has_close) {
                    done();
                } else {
                    done("Close event not found");
                }
            });
        });

        it('should have exit event', function (done) {
            var error, i,
                has_exit = false,
                arg_array = randomArray();
            
            arg_array.unshift(CONSOLE_LOG_01);
            var stream = bacon_spawn(Bacon, 'node', arg_array);

            var exit = stream.filter(function (ev) {
                    return ev.type === 'exit' ? true : false;
                });

            exit.onValue(function (v) {
                has_exit = true;
            });

            exit.onEnd(function() {
                if (has_exit) {
                    done();
                } else {
                    done("Exit event not found");
                }
            });
        });

        it('should generate error if file not found', function (done) {
            var stream = bacon_spawn(Bacon, NOT_FOUND);
            var error;
            stream.endOnError(function(err){
                error = err;
                return true;
            }).onEnd(function (v) {
                if (error) {
                    done();
                } else {
                    done("Error must be generated");
                }
            });
        });
    });

    describe("#stream connect", function () {
        it("should read data from stdin", function(done) {
            var random_data = randomArray();
            var stdin_stream = Bacon.sequentially(10, random_data);
            var stream = bacon_spawn(Bacon, 'node', [STDIN_TO_STDOUT]).connect(stdin_stream);
            var stdout = stream.filter(function(v) {
                return v.type === 'stdout' ? true : false;
            }).map(function (v) {
                return v.data ? v.data.toString() : '';
            });

            stdout.reduce('', function (seed, ev) {
                return seed + ev;
            }).onValue(function(v) {
                expect(v).to.be(random_data.join(''));
                done();
            });
        });

        it("should read data from one process and send to other", function(done) {
            var random_data = randomArray(),
                arg_array = random_data.slice();

            arg_array.unshift(CONSOLE_LOG_01);
            var stream1 = bacon_spawn(Bacon, 'node', arg_array);

            var stdout1 = stream1.filter(function (ev) {
                return ev.type === 'stdout' ? true : false;
            }).map(function(ev) {
                return ev.data.toString();
            });

            var stream2 = bacon_spawn(Bacon, 'node', [STDIN_TO_STDOUT]).connect(stdout1);
            var stdout2 = stream2.filter(function(v) {
                return v.type === 'stdout' ? true : false;
            }).map(function (v) {
                return v.data ? v.data.toString() : '';
            });

            stdout2.reduce('', function (seed, ev) {
                return seed + ev;
            }).onValue(function(v) {
                expect(v).to.be(random_data.join(''));
                done();
            });

        });

    });
});