//
// BACnet device implementation.
// Mapping between properties and default types.
//

const bacnet = require('bacstack');

const pi = bacnet.enum.PropertyIdentifier;
const type = bacnet.enum.ApplicationTags;

const propertyTypeMap = {
	[pi.APPLICATION_SOFTWARE_VERSION]:    type.CHARACTER_STRING,
	[pi.APDU_TIMEOUT]:                    type.UNSIGNED_INTEGER,
	[pi.DATABASE_REVISION]:               type.UNSIGNED_INTEGER,
	[pi.DESCRIPTION]:                     type.CHARACTER_STRING,
	[pi.DEVICE_ADDRESS_BINDING]:          type.CHARACTER_STRING,
	[pi.DEVICE_TYPE]:                     type.CHARACTER_STRING,
	[pi.EVENT_STATE]:                     type.ENUMERATED,
	[pi.FIRMWARE_REVISION]:               type.CHARACTER_STRING,
	[pi.DEVICE_ADDRESS_BINDING]:          type.OCTET_STRING, // just a guess
	[pi.MAX_APDU_LENGTH_ACCEPTED]:        type.UNSIGNED_INTEGER,
	[pi.MODEL_NAME]:                      type.CHARACTER_STRING,
	[pi.NUMBER_OF_APDU_RETRIES]:          type.UNSIGNED_INTEGER,
	[pi.OBJECT_IDENTIFIER]:               type.OBJECTIDENTIFIER,
	[pi.OBJECT_LIST]:                     type.OBJECTIDENTIFIER,
	[pi.OBJECT_NAME]:                     type.CHARACTER_STRING,
	[pi.OBJECT_TYPE]:                     type.ENUMERATED,
	[pi.OUT_OF_SERVICE]:                  type.BOOLEAN,
	//[pi.PRESENT_VALUE]: Not set as this depends on the object type
	[pi.PROPERTY_LIST]:                   type.ENUMERATED,
	[pi.PROTOCOL_OBJECT_TYPES_SUPPORTED]: type.BIT_STRING,
	[pi.PROTOCOL_REVISION]:               type.UNSIGNED_INTEGER,
	[pi.PROTOCOL_SERVICES_SUPPORTED]:     type.BIT_STRING,
	[pi.PROTOCOL_VERSION]:                type.UNSIGNED_INTEGER,
	[pi.SEGMENTATION_SUPPORTED]:          type.ENUMERATED,
	[pi.STATUS_FLAGS]:                    type.BIT_STRING,
	[pi.SYSTEM_STATUS]:                   type.ENUMERATED,
	[pi.UNITS]:                           type.ENUMERATED,
	[pi.VENDOR_IDENTIFIER]:               type.UNSIGNED_INTEGER,
	[pi.VENDOR_IDENTIFIER]:               type.UNSIGNED_INTEGER,
	[pi.VENDOR_NAME]:                     type.CHARACTER_STRING,
};

module.exports = propertyTypeMap;
