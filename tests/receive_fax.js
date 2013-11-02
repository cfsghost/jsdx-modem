
var Modem = require('../');

var modem = new Modem();
modem.init(function() {

	for (var devname in modem.devices) {

		modem.getDevice(devname, function(err, device) {

			device.fax.incommingPath = '/tmp';
			device.fax.listen(function(err) {

				console.log('Listening to ' + devname);
			});
		});
	}
});
