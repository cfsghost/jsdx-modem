"use strict";

var Fax = require('./fax');

var Device = module.exports = function(manager, devname) {
	var self = this;

	self.manager = manager;
	self.devname = devname;
	self.busy = false;

	self.fax = new Fax(self);
};

Device.prototype.acquire = function() {
	var self = this;

	if (!self.busy) {
		self.busy = true;
		return true;
	}

	return false;
};

Device.prototype.close = function() {
	var self = this;

	self.busy = false;
};
