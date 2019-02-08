//
// BACnet device implementation.
// Mapping between properties and default types.
//

const bacnet = require('bacstack');

const pi = bacnet.enum.PropertyIdentifier;
const type = bacnet.enum.ApplicationTags;

const propertyTypeMap = {
	[pi.DATABASE_REVISION]:               type.UNSIGNED_INTEGER,
	[pi.DESCRIPTION]:                     type.CHARACTER_STRING,
	//[pi.DEVICE_ADDRESS_BINDING]: ??,
	[pi.MAX_APDU_LENGTH_ACCEPTED]:        type.UNSIGNED_INTEGER,
	[pi.MODEL_NAME]:                      type.CHARACTER_STRING,
	[pi.OBJECT_IDENTIFIER]:               type.OBJECTIDENTIFIER,
	[pi.OBJECT_LIST]:                     type.OBJECTIDENTIFIER,
	[pi.OBJECT_NAME]:                     type.CHARACTER_STRING,
	[pi.OBJECT_TYPE]:                     type.ENUMERATED,
	//[pi.PRESENT_VALUE]: Not set as this depends on the object type
	[pi.PROPERTY_LIST]:                   type.ENUMERATED, // array
	[pi.PROTOCOL_OBJECT_TYPES_SUPPORTED]: type.BIT_STRING,
	[pi.PROTOCOL_REVISION]:               type.UNSIGNED_INTEGER,
	[pi.PROTOCOL_SERVICES_SUPPORTED]:     type.BIT_STRING,
	[pi.PROTOCOL_VERSION]:                type.UNSIGNED_INTEGER,
	[pi.SEGMENTATION_SUPPORTED]:          type.ENUMERATED,
	[pi.SYSTEM_STATUS]:                   type.ENUMERATED,
	[pi.VENDOR_IDENTIFIER]:               type.UNSIGNED_INTEGER,
	[pi.VENDOR_IDENTIFIER]:               type.UNSIGNED_INTEGER,
	[pi.VENDOR_NAME]:                     type.CHARACTER_STRING,
};

module.exports = propertyTypeMap;
