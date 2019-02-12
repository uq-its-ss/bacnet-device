//
// BACnet device implementation.
// Example for using this module.
//

const BACnetDevice = require('./index.js');
const BE = require('bacstack').enum;

const dev = new BACnetDevice({
	// These parameters are all mandatory by the BACnet spec.
	deviceId: 123,
	name: 'Example device',
	databaseRevision: 1,
});

// Set some properties on the device itself.  The BACnet standard mandates the
// presence of some properties, so these are all set to default values but they
// can be changed as shown here.
dev.addProperty(BE.PropertyIdentifier.MODEL_NAME).value = 'EXAMPLE123';
dev.addProperty(BE.PropertyIdentifier.APPLICATION_SOFTWARE_VERSION).value = 'v0.1';

// Add a new data point to our device.
const exampleInput = dev.addObject(1, BE.ObjectType.ANALOG_INPUT, 'Example value');

// Add some static properties
exampleInput.addProperty(BE.PropertyIdentifier.DESCRIPTION).value = 'This is an example property';

// Add a property to the new data point.  Here we are manually specifying the
// data type (REAL) rather than going with the default type.  Not all properties
// have default types specified (yet), so if you use one of these properties you
// will either have to manually specify the type as we do here, or preferably
// add it to mandatory-properties.js and submit a patch.
const inpPresentValue = exampleInput.addProperty(
	BE.PropertyIdentifier.PRESENT_VALUE,
	BE.ApplicationTags.REAL
);

// Set an initial value for the data point's "present value" property.
inpPresentValue.value = 1;

console.log('Dumping objects contained within this device:');

Object.keys(dev.objects).forEach(objType => {
	const objectsOfType = dev.objects[objType];
	Object.keys(objectsOfType).forEach(objInstance => {
		const o = objectsOfType[objInstance];
		console.log(`\nObject ${objType}#${o.instance}:`, o.dumpProperties());
	});
});
