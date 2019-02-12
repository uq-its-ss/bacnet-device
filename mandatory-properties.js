const BE = require('bacstack').enum;
const pi = BE.PropertyIdentifier;

// Note that OBJECT_IDENTIFIER, OBJECT_NAME, OBJECT_TYPE and PROPERTY_LIST are
// not included in the lists below, as they are not returned by the
// PROPERTY_LIST request.  They are also handled internally so should never be
// omitted by accident.
module.exports = {
	[BE.ObjectType.ANALOG_INPUT]: [
		pi.PRESENT_VALUE,
		pi.STATUS_FLAGS,
		pi.EVENT_STATE,
		pi.OUT_OF_SERVICE,
		pi.UNITS,
	],
	[BE.ObjectType.DEVICE]: [
		pi.SYSTEM_STATUS,
		pi.VENDOR_NAME,
		pi.VENDOR_IDENTIFIER,
		pi.MODEL_NAME,
		pi.FIRMWARE_REVISION,
		pi.APPLICATION_SOFTWARE_VERSION,
		pi.PROTOCOL_VERSION,
		pi.PROTOCOL_REVISION,
		pi.PROTOCOL_SERVICES_SUPPORTED,
		pi.PROTOCOL_OBJECT_TYPES_SUPPORTED,
		pi.OBJECT_LIST,
		pi.MAX_APDU_LENGTH_ACCEPTED,
		pi.SEGMENTATION_SUPPORTED,
		pi.APDU_TIMEOUT,
		pi.NUMBER_OF_APDU_RETRIES,
		pi.DEVICE_ADDRESS_BINDING,
		pi.DATABASE_REVISION,
	],
};
