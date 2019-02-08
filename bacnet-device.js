//
// BACnet device implementation.
// Top level structure for a device object.
//

const assert = require('assert');
const bacnet = require('bacstack');

const BACnetObject = require('./bacnet-object');

// Mandatory BACnet properties for device objects.
const devicePropMap = {
	databaseRevision: bacnet.enum.PropertyIdentifier.DATABASE_REVISION,
	// deviceId is handled separately
	// name is handled separately
	vendorId:         bacnet.enum.PropertyIdentifier.VENDOR_IDENTIFIER,
};

class BACnetDevice extends BACnetObject {
	constructor(deviceInfo) {
		super(deviceInfo.deviceId, bacnet.enum.ObjectType.DEVICE, deviceInfo.name);
		assert(deviceInfo.deviceId, 'Cannot create a new device without a deviceId');
		assert(deviceInfo.name, 'Cannot create a new device without a name');

		// These are the BACnet calls we support.
		this.addProperty(bacnet.enum.PropertyIdentifier.PROTOCOL_SERVICES_SUPPORTED).value = [
			// bacnet.enum.ServicesSupported.ACKNOWLEDGE_ALARM,
//			bacnet.enum.ServicesSupported.CONFIRMED_COV_NOTIFICATION,
			// bacnet.enum.ServicesSupported.CONFIRMED_EVENT_NOTIFICATION,
			// bacnet.enum.ServicesSupported.GET_ALARM_SUMMARY,
			// bacnet.enum.ServicesSupported.GET_ENROLLMENT_SUMMARY,
//			bacnet.enum.ServicesSupported.SUBSCRIBE_COV
			// bacnet.enum.ServicesSupported.ATOMIC_READ_FILE,
			// bacnet.enum.ServicesSupported.ATOMIC_WRITE_FILE,
			// bacnet.enum.ServicesSupported.ADD_LIST_ELEMENT,
			// bacnet.enum.ServicesSupported.REMOVE_LIST_ELEMENT,
			// bacnet.enum.ServicesSupported.CREATE_OBJECT,
			// bacnet.enum.ServicesSupported.DELETE_OBJECT,
			bacnet.enum.ServicesSupported.READ_PROPERTY,
			bacnet.enum.ServicesSupported.READ_PROPERTY_MULTIPLE,
			// bacnet.enum.ServicesSupported.WRITE_PROPERTY,
			// bacnet.enum.ServicesSupported.WRITE_PROPERTY_MULTIPLE,
			// bacnet.enum.ServicesSupported.DEVICE_COMMUNICATION_CONTROL,
			// bacnet.enum.ServicesSupported.CONFIRMED_PRIVATE_TRANSFER,
			// bacnet.enum.ServicesSupported.CONFIRMED_TEXT_MESSAGE,
			// bacnet.enum.ServicesSupported.REINITIALIZE_DEVICE,
			// bacnet.enum.ServicesSupported.VT_OPEN,
			// bacnet.enum.ServicesSupported.VT_CLOSE,
			// bacnet.enum.ServicesSupported.VT_DATA,
			// bacnet.enum.ServicesSupported.READ_PROPERTY_CONDITIONAL,
			// bacnet.enum.ServicesSupported.AUTHENTICATE,
			// bacnet.enum.ServicesSupported.REQUEST_KEY,
			bacnet.enum.ServicesSupported.I_AM,
			// bacnet.enum.ServicesSupported.I_HAVE,
			// bacnet.enum.ServicesSupported.UNCONFIRMED_COV_NOTIFICATION,
			// bacnet.enum.ServicesSupported.UNCONFIRMED_EVENT_NOTIFICATION,
			// bacnet.enum.ServicesSupported.UNCONFIRMED_PRIVATE_TRANSFER,
			// bacnet.enum.ServicesSupported.UNCONFIRMED_TEXT_MESSAGE,
			// bacnet.enum.ServicesSupported.TIME_SYNCHRONIZATION,
			// bacnet.enum.ServicesSupported.WHO_HAS,
			bacnet.enum.ServicesSupported.WHO_IS,
			// bacnet.enum.ServicesSupported.READ_RANGE,
			// bacnet.enum.ServicesSupported.UTC_TIME_SYNCHRONIZATION,
			// bacnet.enum.ServicesSupported.LIFE_SAFETY_OPERATION,
			// bacnet.enum.ServicesSupported.SUBSCRIBE_COV_PROPERTY,
			// bacnet.enum.ServicesSupported.GET_EVENT_INFORMATION,
			// bacnet.enum.ServicesSupported.WRITE_GROUP,
			// bacnet.enum.ServicesSupported.SUBSCRIBE_COV_PROPERTY_MULTIPLE,
			// bacnet.enum.ServicesSupported.CONFIRMED_COV_NOTIFICATION_MULTIPLE,
			// bacnet.enum.ServicesSupported.UNCONFIRMED_COV_NOTIFICATION_MULTIPLE,
		];

		Object.keys(devicePropMap).forEach(key => {
			assert(
				deviceInfo[key] !== undefined,
				`Must specify '${key}' when creating a new device.`
			);
			this.addProperty(devicePropMap[key]).value = deviceInfo[key];
		});

		// Add ourself to the object list.  We can't use addObject() here as that
		// will create a new object (with no child properties), whereas we need
		// this same device object as a child object in order for the OBJECT_LIST
		// property to be correctly constructed.
		this.objects[this.instance] = this;
	}

};

module.exports = BACnetDevice;
