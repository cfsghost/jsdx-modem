
var Modem = require('../');

var modem = new Modem();
modem.init(function() {

	for (var devname in modem.devices) {

		modem.getDevice(devname, function(err, device) {

			device.fax.incommingPath = '/tmp';
			device.fax.listen(function(err) {

				console.log('Listening to ' + devname);
			});

			device.fax.on('received', function(id, files) {
				console.log('Received a fax document:');
				for (var index in files) {
					console.log(files[index]);
				}
			});
		});
	}
});
