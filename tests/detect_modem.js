
var Modem = require('../');

var modem = new Modem();
modem.init(function() {
	console.log(modem.devices);
});
