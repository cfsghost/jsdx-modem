"use strict";

var util = require('util');
var events = require('events');
var child_process = require('child_process');
var uuid = require('node-uuid');

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
	self.incomingPath = '/tmp';
	self.daemon = null;
};

util.inherits(Fax, events.EventEmitter);

Fax.prototype.listen = function(callback) {
	var self = this;

	if (!self.device.acquire() || self.daemon) {
		process.nextTick(function() {
			callback(new Error('device is busy'));
		});
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
		id + '_' + self.device.devname
	], { cwd: self.incomingPath }); 

	// When efax program is closed, it means work is completed.
	efax.on('close', function(code) {

		// Fax daemon was killed, doens't receive anything.
		if (!self.daemon) {
			self.emit('close');
			return;
		}

		// Delay 1 second to make sure that device was released
		setTimeout(function() {

			self.close();
			self.emit('received', id);
		}, 1000);
	});

	process.nextTick(function() {

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
};
