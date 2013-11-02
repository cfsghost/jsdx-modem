"use strict";

var util = require('util');
var events = require('events');
var async = require('async');
var udev = require('udev');

var Device = require('./device');

var monitor = udev.monitor();

var Modem = module.exports = function() {
	var self = this;

	self.udev = udev;
	self.devices = {};

/*
	monitor.on('add', function(device) {
		console.log(device);
	});
*/
};

util.inherits(Modem, events.EventEmitter);

Modem.prototype.init = function(callback) {
	var self = this;

	async.each(udev.list(), function(device, next) {
		if (device.SUBSYSTEM != 'tty') {
			next();
			return;
		}

		// Detect USB Device
		if (device.ID_USB_DRIVER) {

			// ACM
			if (device.ID_USB_DRIVER == 'cdc_acm') {
				self.devices[device.DEVNAME] = device;
			}
		}

		next();

	}, function() {

		callback(null);
	});
};

Modem.prototype.getDevice = function(devname, callback) {
	var self = this;

	process.nextTick(function() {
		var dev = self.devices[devname] || null;

		if (!dev) {
			callback(new Error('No such device'));
			return;
		}

		// Create object for specific device
		var device = new Device(self, devname);

		callback(null, device);
	});
};
