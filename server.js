var express = require('express');
var proxy = require('proxy-agent');
var fs = require('fs');
var MBTiles = require('@mapbox/mbtiles');
var app = express();
var LRU = require("lru-cache")
  , options = { max: 100000
			  , length: function (key, n) { return fs.statSync(key)['size']/1000000.0}
			  , dispose: function (key, n) { console.log('dispose',n,fs.statSync(n)); fs.statSync(n) && fs.unlink(n);  }
              , maxAge: 1000 * 60 * 60} // 1 Hour
  , cache = LRU(options);

var AWS = require('aws-sdk');
if (process.argv.length < 4) {
  console.log("Error! Missing AWS Credentials.\n accessKeyId & secretAccessKey required");
  process.exit(1);
}
accessKeyId = process.argv[2];
secretAccessKey = process.argv[3];
AWS.config.update({
	accessKeyId: accessKeyId,
	secretAccessKey: secretAccessKey,
	region: "ap-southeast-2"
	});
var s3 = new AWS.S3();

var port = 3000;

app.get('/:z/:x/:y.*', function(req, res){
	function zeroPad(num, numZeros) {
		var zeros = Math.max(0, numZeros - num.toString().length);
		var zeroString = Math.pow(10, zeros).toString().substr(1);
		return zeroString + num;
	}
	// CREATE BUNDLE FILE NAMES USING Z, X, Y
	var level = req.param('z');
	var col = req.param('x');
	var row = req.param('y');
	var colVal = (parseInt(col / 128)) * 128;
	var rowVal = (parseInt(row / 128)) * 128;
	var colName = zeroPad(colVal.toString(16), 4);
	var rowName = zeroPad(rowVal.toString(16), 4);
	var levelName = zeroPad(level.toString(10), 2);
	
	mbtfile = '/R' + rowName + 'C' + colName;
	var temp = '/home/ubuntu/mbtcache/L' + level; // TEMP FOLDER FOR CACHE IN EC2
	var tempFile = temp + mbtfile + '.mbtiles';
	if ((fs.existsSync(tempFile)) && (fs.statSync(tempFile)['size'] != 0)){
		var mbt = cache.get(mbtfile);
		if(mbt){
			cache.get(mbtfile);
		} else {
			cache.set(mbtfile, tempFile);
		}
		getTile(tempFile, function(err, tile){
			res.header("Content-Type", "image/png");
			res.send(err || tile);
		});
		return;
	} else {
		if (!fs.existsSync(temp)){
			fs.mkdirSync(temp);
		}
		key = 'mbt/L' + level + mbtfile + '.mbtiles';
		var file = require('fs').createWriteStream(tempFile);
		stream = s3.getObject({Bucket: 'msd-1', Key: key}).createReadStream().pipe(file);
		stream.on('finish', function(){
			getTile(tempFile, function(err, tile){
				res.header("Content-Type", "image/png");
				res.send(err || tile);
			})
		});
		return;	
	}
	function getTile(mbtilesLocation){
		new MBTiles(mbtilesLocation, function(err, mbtiles){
			var extension = req.param(0);
			switch (extension) {
				case "png": {
					mbtiles.getTile(level, col, row, function(err, tile, headers){
						if (err) {
							console.log('Cant find tile',level, col, row)
							res.status(404).send('Tile rendering error: ' + err + '\n');
						} else {
							res.header("Content-Type", "image/png")
							res.send(tile);
						}
					});
					mbtiles.close();
					break;
				}
				case "grid.json": {
					mbtiles.getGrid(req.param('z'), req.param('x'), req.param('y'), function(err, grid, headers){
						if (err) {
							res.status(404).send('Grid rendering error: ' + err + '\n');
						} else {
							res.header("Content-Type", "text/json")
							res.send(grid);
						}
					});
					break;
				}
			}
			err && console.log(err);
		});	
	}

});
// actually create the server
app.listen(port);
