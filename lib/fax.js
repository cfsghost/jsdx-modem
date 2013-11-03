"use strict";

var util = require('util');
var events = require('events');
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var uuid = require('node-uuid');
var async = require('async');

var Fax = module.exports = function(device) {
	var self = this;

	self.device = device;
	self.modemInit1 = '-iZ';
	self.modemInit2 = '-i&FE0&D2S7=120';
	self.modemInit3 = '-i&C0';
	self.modemReset = '-kZ';
	self.modemSPKR = '-iM1L0';
	self.modemDCMD = 'exec /sbin/getty -h ' + self.device.devname + ' %d vt100';
	self.modemAnswerRing = 1;
	self.tempPath = '/tmp';
	self.incomingPath = '/tmp/incoming';
	self.daemon = null;
};

util.inherits(Fax, events.EventEmitter);

Fax.prototype.listen = function(callback) {
	var self = this;

	process.nextTick(function() {

		if (!self.device.acquire() || self.daemon) {
			callback(new Error('device is busy'));
		}

		// Execute eFax in the background to wait
		var id = uuid.v1();
		var efax = self.daemon = child_process.spawn('efax', [
			'-d' + self.device.devname,
			self.modemInit1,
			self.modemInit2,
			self.modemInit3,
			self.modemSPKR,
			self.modemReset,
			'-g',
			self.modemDCMD,
			'-jS0=' + self.modemAnswerRing,
			'-w',
			'-s',
			'-olll',
			'-r',
			id
		], { cwd: self.tempPath }); 

		// When efax program is closed, it means work is completed.
		efax.on('close', function(code) {

			// Fax daemon was killed, doens't receive anything.
			if (!self.daemon) {
				self.close();
				return;
			}

			self.daemon = null;

			// Move documents to specific path
			self.getDocument(id, function(err, files) {

				async.each(files, function(file, next) {
					var input = fs.createReadStream(path.join(self.tempPath, file));
					var output = fs.createWriteStream(path.join(self.incomingPath, file));

					input.on('error', function(err) {
						next(err);
					});

					output.on('error', function(err) {
						next(err);
					});

					output.on('close', function() {
						next();
					});

					input.pipe(output);

				}, function(err) {

					// Error handling
					if (err) {
						self.close();
						self.emit('error', err);
						return;
					}

					// Delay 1 second to make sure that device was released
					setTimeout(function() {

						self.close();
						self.emit('received', id, files);
					}, 1000);
				});
			});
		});

		callback(null);
	});
};

Fax.prototype.close = function() {
	var self = this;

	if (self.daemon) {
		var daemon = self.daemon;
		self.daemon = null;

		daemon.kill('SIGHUP');
	} else {
		self.daemon = null;
	}

	self.device.close();

	self.emit('close');
};

Fax.prototype.getDocument = function(id, callback) {
	var self = this;

	fs.readdir(self.incomingPath, function(err, files) {
		if (err) {
			callback(err);
			return;
		}

		var filelist = [];
		async.each(files, function(filename, next) {

			if (filename.indexOf(id) != 0) {
				next();
				return;
			}

			filelist.push(filename);
			next();
		}, function() {

			callback(null, filelist);
		});

	});
};

Fax.prototype.listDocument = function(callback) {
	var self = this;

	fs.readdir(self.incomingPath, function(err, files) {
		if (err) {
			callback(err);
			return;
		}

		var docs = {};
		async.each(files, function(filename, next) {

			var id = path.basename;
			if (!docs[id]) {
				docs[id] = {
					pagecount: 1
				};
			} else if (filename.indexOf(id) != 0) {
				docs[id].pagecount++;
			}

			next();

		}, function() {

			callback(null, docs);
		});

	});
};
