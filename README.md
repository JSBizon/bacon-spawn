

bacon-spawn - spawn child process and create bacon stream

## Synopsis

``` javascript
var bacon_spawn = require('bacon-spawn'),
    Bacon = require('baconjs');

var bacon_stream = bacon_spawn(Bacon,'ls', ['-lh', './']);
```

## Installation

If you have npm installed, you can simply type:

          npm install bacon-spawn

Or you can clone this repository using the git command:

          git clone git://github.com/JSBizon/bacon-spawn.git

## Usage

Start child process and create Bacon stream:

``` javascript
var bacon_spawn = require('bacon-spawn'),
    Bacon = require('baconjs');

var bacon_stream = bacon_spawn(Bacon,'cat', ['./file.txt']);
```

bacon_stream will produce events objects. 

```
{
    type: 'stdout',
    data: data,
    process: process,
    code: code,
    signal: signal
    sendHandle: sendHandle,
}
```

Event object properties:

  * _type_ - string - the name of event, could be: 'stdout', 'stdin', 'close', 'exit', 'message', 'diconnect' produced by [child process](https://nodejs.org/api/child_process.html#child_process_class_childprocess "child process"). 
  * _data_ - Buffer - piece of data for 'stdout', 'stdin' and 'message' events
  * _process_ - ChildProcess - object of [child processes](https://nodejs.org/api/child_process.html#child_process_class_childprocess "child process")
  * _code_ - number -  the exit code for 'close' and 'exit' events
  * _signal_ - string - the signal passed to kill the child process
  * _sendHandle_ - Handle object

You can connect bacon stream how stdin for child process:

```
    var stdin = BACON.sequentially(1,['value1','value2']);
    var stream = bacon_spawn(Bacon, 'cat').connect(stdin);
```

## Examples

####Read stdout:

``` javascript
    var stream = bacon_spawn(Bacon, 'cat', ['./file.txt']);
    stream2.filter(function(v) {
        return v.type === 'stdout' ? true : false;
    }).map(function (v) {
        return v.data ? v.data.toString() : '';
    }).reduce('', function (seed, ev) {
        return seed + ev;
    }).onValue(function(full_stdout) {
        console.log(full_stdout);
    })
```

####Connect stdout from one process to stdin for other:

``` javascript
    var stdin = bacon_spawn(Bacon, 'ls', ['-lh', './']).filter(function (ev) {
        return ev.type === 'stdout' ? true : false;
    }).map(function(ev) {
        return ev.data.toString();
    });

    var stream = bacon_spawn(Bacon, 'cat').connect(stdin);
```