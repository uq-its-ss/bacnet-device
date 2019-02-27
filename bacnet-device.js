//
// BACnet device implementation.
// Top level structure for a device object.
//

const assert = require('assert');
const bacnet = require('bacstack');
const BE = bacnet.enum;
const pi = bacnet.enum.PropertyIdentifier;
const debug = require('debug')('bacnet-device');
debug.traffic = debug.extend('traffic');
debug.error = debug.extend('error*'); // '*' suffix means always visible

const BACnetObject = require('./bacnet-object');
const BACnetObjectProperty = require('./bacnet-object-property');
const Util = require('./util');

class BACnetDevice extends BACnetObject
{
	/**
	 * Create a new BACnet device and listen for BACnet traffic.
	 *
	 * @param object deviceInfo
	 *   Must contain all members in `devicePropMap`, plus:
	 *   - `name`: Device friendly name for user display.
	 *   - `deviceId`: BACnet device instance.  Must be a unique number on the
	 *     BACnet network.
	 *
	 * @param object hostInfo
	 *   - port: BACnet port to listen on, omit for default 47808.
	 *   - ip: If functioning as a BBMD, this is our own IP address.  Must be
	 *     reachable by the BMS, which will contact us directly on the IP after
	 *     locating us by using the BBMD to forward us broadcasts.
	 */
	constructor(deviceInfo, hostInfo = {}) {
		super(null, deviceInfo.deviceId, bacnet.enum.ObjectType.DEVICE, deviceInfo.name);
		this.dev = this;

		assert(deviceInfo.deviceId, 'Cannot create a new device without a deviceId');
		assert(deviceInfo.name, 'Cannot create a new device without a name');

		// Set some defaults to ensure we comply with BACnet standards
		this.addProperty(pi.SYSTEM_STATUS).value = BE.DeviceStatus.OPERATIONAL;
		this.addProperty(pi.VENDOR_NAME).value = 'NodeJS bacnet-device';
		this.addProperty(pi.VENDOR_IDENTIFIER).value = 0;
		this.addProperty(pi.MODEL_NAME).value = 'bacnet-device default device name';
		this.addProperty(pi.FIRMWARE_REVISION).value = 1;
		this.addProperty(pi.APPLICATION_SOFTWARE_VERSION).value = 1;
		this.addProperty(pi.PROTOCOL_VERSION).value = 1;
		this.addProperty(pi.PROTOCOL_REVISION).value = 1;
		this.addProperty(pi.PROTOCOL_SERVICES_SUPPORTED).value = [
			// These are the BACnet calls we support.

			// bacnet.enum.ServicesSupported.ACKNOWLEDGE_ALARM,
			bacnet.enum.ServicesSupported.CONFIRMED_COV_NOTIFICATION,
			// bacnet.enum.ServicesSupported.CONFIRMED_EVENT_NOTIFICATION,
			// bacnet.enum.ServicesSupported.GET_ALARM_SUMMARY,
			// bacnet.enum.ServicesSupported.GET_ENROLLMENT_SUMMARY,
			bacnet.enum.ServicesSupported.SUBSCRIBE_COV,
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
			bacnet.enum.ServicesSupported.SUBSCRIBE_COV_PROPERTY,
			// bacnet.enum.ServicesSupported.GET_EVENT_INFORMATION,
			// bacnet.enum.ServicesSupported.WRITE_GROUP,
			// bacnet.enum.ServicesSupported.SUBSCRIBE_COV_PROPERTY_MULTIPLE,
			// bacnet.enum.ServicesSupported.CONFIRMED_COV_NOTIFICATION_MULTIPLE,
			// bacnet.enum.ServicesSupported.UNCONFIRMED_COV_NOTIFICATION_MULTIPLE,
		];
		// PROTOCOL_OBJECT_TYPES_SUPPORTED is handled by our parent class.
		// OBJECT_LIST is handled by our parent class.
		this.addProperty(pi.MAX_APDU_LENGTH_ACCEPTED).value = 1482;
		this.addProperty(pi.SEGMENTATION_SUPPORTED).value = BE.Segmentation.SEGMENTED_BOTH;
		// APDU_TIMEOUT is handled by getProperty().
		this.addProperty(pi.NUMBER_OF_APDU_RETRIES).value = 3;
		this.addProperty(pi.DEVICE_ADDRESS_BINDING).value = [];
		this.addProperty(pi.DATABASE_REVISION).value = 1;

		// This property is dynamic since we override getProperty() and provide a
		// value there.  We have to add it to the list of dynamic properties so that
		// it gets included when lists of properties are requested, as it will never
		// appear in `this.properties`.
		this.dynamicProperties.push(pi.APDU_TIMEOUT);

		// Add ourself to the object list.  We can't use addObject() here as that
		// will create a new object (with no child properties), whereas we need
		// this same device object as a child object in order for the OBJECT_LIST
		// property to be correctly constructed.
		if (!this.objects[bacnet.enum.ObjectType.DEVICE]) {
			this.objects[bacnet.enum.ObjectType.DEVICE] = {};
		}
		this.objects[bacnet.enum.ObjectType.DEVICE][this.instance] = this;

		this.ip = hostInfo.ip;
		this.client = new bacnet({
			adpuTimeout: 6000,
			port: hostInfo.port,
		});

		// Start with an empty Broadcast Distribution Table.
		this.bdt = {};

		// And and empty list of SubscribeCov entries.
		this.subscriptions = [];

		// Set up BACnet callbacks
		this.client.on('unhandledEvent', this.onUnhandledEvent.bind(this));
		this.client.on('registerForeignDevice', this.onRegisterForeignDevice.bind(this));
		this.client.on('whoIs', this.onWhoIs.bind(this));
		this.client.on('readProperty', this.onReadProperty.bind(this));
		this.client.on('readPropertyMultiple', this.onReadPropertyMultiple.bind(this));
		this.client.on('subscribeCov', this.onSubscribeCov.bind(this));
		this.client.on('subscribeProperty', this.onSubscribeProperty.bind(this));
	}

	getProperty(propertyId) {
		switch (propertyId) {
			case bacnet.enum.PropertyIdentifier.APDU_TIMEOUT: {
				// Get the timeout value from node-bacstack
				const prop = new BACnetObjectProperty(this, propertyId, undefined, true);
				prop._value = this.client._settings.apduTimeout;
				return prop;
			}
			default:
				return super.getProperty(propertyId);
		}
	}

	/**
	 * The default code will respond to unhandled messages with an error, however
	 * the error will be broadcasted to the local subnet.  Since we are
	 * functioning as a hybrid device+BBMD, we need to examine the message and if
	 * it has been sent to us as if we're a BBMD, then we need to respond in BBMD
	 * mode instead, otherwise the error response won't make it to the caller and
	 * they will think we have gone offline.
	 */
	onUnhandledEvent(msg) {
		if (msg.header.expectingReply) {
			if (msg.header.sender.forwardedFrom) {
				// Message came from a BBMD, so need to reply as if we're a BBMD.
				msg.header.sender.forwardedFrom = this.ip;
			}
			const enumType = msg.header.confirmedService ? BE.ConfirmedServiceChoice : BE.UnconfirmedServiceChoice;
			debug.traffic('Replying with error for unhandled service:', BE.getEnumName(enumType, msg.service));
			this.client.errorResponse(
				msg.header.sender,
				msg.service,
				msg.invokeId,
				BE.ErrorClass.SERVICES,
				BE.ErrorCode.REJECT_UNRECOGNIZED_SERVICE
			);
		}
	}

	onRegisterForeignDevice(msg) {
		debug.traffic('[recv] Register foreign device:', msg.header.sender.address, 'for TTL', msg.payload.ttl);
		// Add to device table
		// TODO: Use a date + TTL so we don't have to keep checking it
		this.bdt[msg.header.sender.address] = msg.payload.ttl;
		this.client.resultResponse(msg.header.sender, BE.BvlcResultFormat.SUCCESSFUL_COMPLETION);
	}

	onWhoIs(msg) {
		if (
			(
				(msg.payload.lowLimit === undefined)
				|| (msg.payload.highLimit === undefined)
			) || (
				(msg.payload.lowLimit <= this.instance)
				&& (msg.payload.highLimit >= this.instance)
			)
		) {
			if (msg.header.sender.forwardedFrom) {
				// Message came from a BBMD, so need to reply as if we're a BBMD.
				//msg.header.sender.forwardedFrom = this.ip;

				// Actually it seems like responses should be returned direct to the
				// caller by the device, bypassing the BBMD.
				msg.header.sender.forwardedFrom = null;
			}
			debug.traffic(`[send] Replying to whoIs(${msg.payload.lowLimit}..`
				+ `${msg.payload.highLimit}): iAm ${this.instance} -> `
				+ `${msg.header.sender.address}/${msg.header.sender.forwardedFrom}`);
			this.client.iAmResponse(
				msg.header.sender,
				this.instance,
				this.getProperty(BE.PropertyIdentifier.SEGMENTATION_SUPPORTED).value,
				this.getProperty(BE.PropertyIdentifier.VENDOR_IDENTIFIER).value
			);
		}
	}

	onReadProperty(msg) {
		const propertyName = Util.getEnumName(BE.PropertyIdentifier, msg.payload.property.id);
		const typeName = Util.getEnumName(BE.ObjectType, msg.payload.objectId.type);
		const objectIdName = typeName + ':' + msg.payload.objectId.instance;
		debug.traffic(`[recv/${msg.header.sender.address}] readProperty: ${objectIdName}/${propertyName}`);

		const object = this.getObject(msg.payload.objectId.instance, msg.payload.objectId.type);
		if (!object) {
			debug.error(`[send/${msg.header.sender.address}] Requested non-existent `
				+ `object ${objectIdName}, responding with error`);
			return this.client.errorResponse(
				msg.header.sender,
				BE.ConfirmedServiceChoice.READ_PROPERTY,
				msg.invokeId,
				bacnet.enum.ErrorClass.OBJECT,
				bacnet.enum.ErrorCode.UNKNOWN_OBJECT
			);
		}

		let property = object.getProperty(msg.payload.property.id);
		if (!property) {
			debug.error(`[send/${msg.header.sender.address}] Requested non-existent `
				+ `property ${propertyName} for object ${objectIdName}, responding `
				+ `with error`);
			return this.client.errorResponse(
				msg.header.sender,
				BE.ConfirmedServiceChoice.READ_PROPERTY,
				msg.invokeId,
				bacnet.enum.ErrorClass.PROPERTY,
				bacnet.enum.ErrorCode.UNKNOWN_PROPERTY
			);
		}

		if (msg.payload.property.index === 0xFFFFFFFF) {
			const content = this.encodePropValue(property);
			this.client.readPropertyResponse(
				msg.header.sender,
				msg.invokeId,
				msg.payload.objectId,
				msg.payload.property,
				content
			);
			debug.traffic(`[send/${msg.header.sender.address}] readPropertyResponse@all: ${objectIdName}/${propertyName} => %O`, content);
		} else {
			const slot = property.value[msg.payload.property.index];
			if (!slot) {
				return this.client.errorResponse(
					msg.header.sender,
					BE.ConfirmedServiceChoice.READ_PROPERTY,
					msg.invokeId,
					bacnet.enum.ErrorClass.PROPERTY,
					bacnet.enum.ErrorCode.INVALID_ARRAY_INDEX
				);
			}

			this.client.readPropertyResponse(
				msg.header.sender,
				msg.invokeId,
				msg.payload.objectId,
				msg.payload.property,
				this.encodePropValue(slot)
			);
			debug.traffic(`[send/${msg.header.sender.address}] readPropertyResponse@${msg.payload.property.index}: ${objectIdName}/${propertyName}`);
		}
	}

	onReadPropertyMultiple(msg) {
		debug.traffic(`[recv/${msg.header.sender.address}] readPropertyMultiple`);
		const responseList = [];
		const propGroups = msg.payload.properties;
		propGroups.forEach(propGroup => {
			const typeName = Util.getEnumName(BE.ObjectType, propGroup.objectId.type);
			const objectIdName = typeName + ':' + propGroup.objectId.instance;
			const propListFriendly = propGroup.properties.map(prop => Util.getEnumName(BE.PropertyIdentifier, prop.id));
			debug.traffic(`[recv/${msg.header.sender.address}] readPropertyMultiple: object ${objectIdName}/%O`, propListFriendly);

			// BACnet spec 15.7.2
			// If a device ID of 4194303 is given for a DEVICE(8) read, it should be
			// treated as if the correct device instance was supplied, to allow
			// discovering a device that does not respond with I-Am messages.
			if (
				(propGroup.objectId.type === BE.ObjectTypesSupported.DEVICE)
				&& (propGroup.objectId.instance === BE.ASN1_MAX_PROPERTY_ID)
			) {
				propGroup.objectId.instance = this.instance;
			}

			const object = this.getObject(propGroup.objectId.instance, propGroup.objectId.type);
			const propList = [];

			propGroup.properties.forEach(item => {
				let content;
				if (!object) {
					// Object was invalid, so every prop is going to be an error.
					content = [{
						type: 0,
						value: {
							type: 'BacnetError',
							errorClass: bacnet.enum.ErrorClass.OBJECT,
							errorCode: bacnet.enum.ErrorCode.UNKNOWN_OBJECT,
						},
					}];
				} else {
					if (item.id === BE.PropertyIdentifier.ALL) {
						// Caller wants all properties for this object.
						object.getAllPropertyIds().forEach(propertyId => {
							// BACnet spec 15.7.3.1.2
							// ALL and REQUIRED bulk property requests omit PROPERTY_LIST.
							if (propertyId === BE.PropertyIdentifier.PROPERTY_LIST) return;

							const prop = object.getProperty(propertyId);
							propList.push({
								property: {
									id: propertyId,
									index: BE.ASN1_ARRAY_ALL,
								},
								value: this.encodePropValue(prop),
							});
						});
						return;
					}

					// Specific properties are listed, so just get those.
					const property = object.getProperty(item.id);
					if (!property) {
						// Property doesn't exist, include an error for this property but
						// still allow other valid ones to be returned.
						content = [{
							type: 0,
							value: {
								type: 'BacnetError',
								errorClass: bacnet.enum.ErrorClass.PROPERTY,
								errorCode: bacnet.enum.ErrorCode.UNKNOWN_PROPERTY,
							},
						}];
					} else if (item.index === BE.ASN1_ARRAY_ALL) {
						content = this.encodePropValue(property);
					} else {
						const slot = Array.isArray(property.value) && property.value[item.index];
						if (!slot) {
							// This array index within the property is invalid.
							content = [{
								type: 0,
								value: {
									type: 'BacnetError',
									errorClass: bacnet.enum.ErrorClass.PROPERTY,
									errorCode: bacnet.enum.ErrorCode.INVALID_ARRAY_INDEX,
								},
							}];
						} else {
							content = this.encodePropValue(slot);
						}
					}
				}

				// Add the requested property to the list we will be returning, along
				// with either its value or an error code.
				assert(Array.isArray(content));
				propList.push({
					property: {
						id: item.id,
						index: item.index,
					},
					value: content,
				});
			});

			// Add the object's props (along with any errors for invalid props), or
			// the single error object if an invalid object instance was given.
			responseList.push({
				objectId: {type: propGroup.objectId.type, instance: propGroup.objectId.instance},
				values: propList
			});
		});

		debug.traffic(
			`[send/${msg.header.sender.address}] readPropertyMultiple response: %d objects, %d total properties`,
			responseList.length,
			responseList.map(o => o.values.length).reduce((a, b) => a + b)
		);
		this.client.readPropertyMultipleResponse(
			msg.header.sender,
			msg.invokeId,
			responseList
		);
	}

	onSubscribeCov(msg) {
		const typeName = Util.getEnumName(BE.ObjectType, msg.payload.monitoredObjectId.type);
		const objectIdName = typeName + ':' + msg.payload.monitoredObjectId.instance;
		debug.traffic(`[recv/${msg.header.sender.address}] subscribeCov: object ${objectIdName}`);

		const object = this.getObject(msg.payload.monitoredObjectId.instance, msg.payload.monitoredObjectId.type);
		if (!object) {
			// Invalid object
			debug(`${msg.header.sender.address} tried to subscribe to non-existent object ${objectIdName}`);
			debug.traffic(`[send/${msg.header.sender.address}] Returning error OBJECT:UNKNOWN_OBJECT`);
			this.client.errorResponse(
				msg.header.sender,
				msg.service,
				msg.invokeId,
				BE.ErrorClass.OBJECT,
				BE.ErrorCode.UNKNOWN_OBJECT
			);
			return;
		}

		// Remove any existing subscription for this property and device, as well as
		// any expired ones.
		object.subscriptions = object.subscriptions.filter(sub => (
			(sub.subscriberAddress != msg.header.sender)
			&& (sub.subscriberProcessId != msg.payload.subscriberProcessId)
			&& (sub.lifetime > 0)
		));

		// Add the new subscription if a non-zero lifetime is given (as a zero or
		// missing lifetime means 'unsubscribe').
		if (msg.payload.lifetime) {
			const sub = {
				subscriberAddress: msg.header.sender,
				monitoredObjectId: msg.payload.monitoredObjectId,
				subscriberProcessId: msg.payload.subscriberProcessId,
				issueConfirmedNotifications: true,
				invokeId: msg.invokeId,
				lifetime: msg.payload.lifetime,
			}
			object.subscriptions.push(sub);
			debug(`Adding subscription to object ${objectIdName} for ${msg.header.sender.address}#${msg.payload.subscriberProcessId}`);

			// We have to send an update immediately after the subscription, even if
			// the value hasn't changed.
			let propList = [];
			// Get all property values.
			object.getAllPropertyIds().forEach(propertyId => {
				const property = object.getProperty(propertyId);
				propList.push({
					property: {
						id: propertyId,
					},
					value: this.encodePropValue(property),
				});
			});
			this.sendPropertyCov(sub, propList);
		} else {
			debug(`Removing subscription to object ${objectIdName} by ${msg.header.sender.address}#${msg.payload.subscriberProcessId}`);
		}

		debug.traffic(`[send/${msg.header.sender.address}] simpleAckResponse for subscribeCov`);
		this.client.simpleAckResponse(
			msg.header.sender,
			msg.service,
			msg.invokeId,
		);
	}

	onSubscribeProperty(msg) {
		const typeName = Util.getEnumName(BE.ObjectType, msg.payload.monitoredObjectId.type);
		const objectIdName = typeName + ':' + msg.payload.monitoredObjectId.instance;
		debug.traffic(`[recv/${msg.header.sender.address}] subscribeCovProperty: object ${objectIdName}`);

		if (!msg.payload.issueConfirmedNotifications) {
			// Unconfirmed notifications aren't yet implemented in bacstack
			debug(`Returning error to ${msg.header.sender.address} - unable to subscribe with unconfirmed notifications`);
			debug.traffic(`[send/${msg.header.sender.address}] Returning error OBJECT:OPTIONAL_FUNCTIONALITY_NOT_SUPPORTED`);
			this.client.errorResponse(
				msg.header.sender,
				msg.service,
				msg.invokeId,
				BE.ErrorClass.OBJECT,
				BE.ErrorCode.OPTIONAL_FUNCTIONALITY_NOT_SUPPORTED
			);
			return;
		}

		const object = this.getObject(msg.payload.monitoredObjectId.instance, msg.payload.monitoredObjectId.type);
		if (!object) {
			// Invalid object
			debug(`${msg.header.sender.address} tried to subscribe to non-existent object ${objectIdName}`);
			debug.traffic(`[send/${msg.header.sender.address}] Returning error OBJECT:UNKNOWN_OBJECT`);
			this.client.errorResponse(
				msg.header.sender,
				msg.service,
				msg.invokeId,
				BE.ErrorClass.OBJECT,
				BE.ErrorCode.UNKNOWN_OBJECT
			);
			return;
		}

		const property = object.getProperty(msg.payload.monitoredProperty.id);
		const propertyName = Util.getPropName(msg.payload.monitoredProperty.id);
		if (!property) {
			// Invalid property
			debug(`${msg.header.sender.address} tried to subscribe to non-existent property ${objectIdName}/${propertyName}`);
			debug.traffic(`[send/${msg.header.sender.address}] Returning error PROPERTY:UNKNOWN_PROPERTY`);
			this.client.errorResponse(
				msg.header.sender,
				msg.service,
				msg.invokeId,
				BE.ErrorClass.PROPERTY,
				BE.ErrorCode.UNKNOWN_PROPERTY
			);
			return;
		}

		// Remove any existing subscription for this property and device, as well as
		// any expired ones.
		property.subscriptions = property.subscriptions.filter(sub => (
			(sub.subscriberAddress != msg.header.sender)
			&& (sub.subscriberProcessId != msg.payload.subscriberProcessId)
			&& (sub.lifetime > 0)
		));

		// Add the new subscription if a non-zero lifetime is given (as a zero or
		// missing lifetime means 'unsubscribe').
		if (msg.payload.lifetime) {
			const sub = {
				subscriberAddress: msg.header.sender,
				monitoredObjectId: msg.payload.monitoredObjectId,
				subscriberProcessId: msg.payload.subscriberProcessId,
				issueConfirmedNotifications: msg.payload.issueConfirmedNotifications,
				monitoredIndex: msg.payload.monitoredProperty.index,
				invokeId: msg.invokeId,
				lifetime: msg.payload.lifetime,
			};
			property.subscriptions.push(sub);
			debug(`Adding subscription to property ${objectIdName}/${propertyName} for ${msg.header.sender.address}#${msg.payload.subscriberProcessId}`);

			// We have to send an update immediately after the subscription, even if
			// the value hasn't changed.
			let propList = [];
			propList.push({
				property: {
					id: property.propertyId,
				},
				value: this.encodePropValue(property),
			});
			this.sendPropertyCov(sub, propList);

		} else {
			debug(`Removing subscription to ${objectIdName}/${propertyName} by ${msg.header.sender.address}#${msg.payload.subscriberProcessId}`);
		}

		debug.traffic(`[send/${msg.header.sender.address}] simpleAckResponse for subscribeCovProperty`);
		this.client.simpleAckResponse(
			msg.header.sender,
			msg.service,
			msg.invokeId,
		);
	}

	/**
	 * Top-level callback function when any property is changed.  We need to look
	 * up any subscriptions and send messages out as needed.
	 */
	onObjectPropertyChanged(object, property) {
		let propList = [];

		propList.push({
			property: {
				id: property.propertyId,
			},
			value: this.encodePropValue(property),
		});

		if (object.subscriptions) {
			// TODO: add batch/transaction start/stop functions to collect all changes
			// up into small number of messages, instead of one per property.
			object.subscriptions.forEach(sub => {
				const typeName = Util.getEnumName(BE.ObjectType, sub.monitoredObjectId.type);
				const objectIdName = typeName + ':' + sub.monitoredObjectId.instance;
				this.sendPropertyCov(sub, propList);
			});
		}

		if (property.subscriptions) {
			property.subscriptions.forEach(sub => {
				const typeName = Util.getEnumName(BE.ObjectType, sub.monitoredObjectId.type);
				const objectIdName = typeName + ':' + sub.monitoredObjectId.instance;
				const propertyName = Util.getPropName(property.propertyId);
				debug.traffic(`[send/${sub.subscriberAddress.address}] confirmedCOVNotification: property ${objectIdName}/${propertyName}`);
				this.sendPropertyCov(sub, propList);
			});
		}
	}

	/**
	 * Send a COV notification.
	 *
	 * This is a separate function as we need to send the same message both when
	 * the value changes, as well as when a subscription request comes through.
	 */
	sendPropertyCov(sub, propList) {
		const typeName = Util.getEnumName(BE.ObjectType, sub.monitoredObjectId.type);
		const objectIdName = typeName + ':' + sub.monitoredObjectId.instance;
		debug.traffic(`[send/${sub.subscriberAddress.address}] confirmedCOVNotification: object ${objectIdName}, ${propList.length} items`);
		if (sub.issueConfirmedNotifications) {
			this.client.confirmedCOVNotification(
				sub.subscriberAddress,
				sub.monitoredObjectId,
				sub.subscriberProcessId,
				this.instance,
				sub.lifetime,
				propList,
				{
					invokeId: sub.invokeId,
				},
				err => {
					if (err) {
						debug.traffic(`[recv/${sub.subscriberAddress.address}] confirmedCOVNotification was rejected:`, err);
					} else {
						debug.traffic(`[recv/${sub.subscriberAddress.address}] confirmedCOVNotification was ACKed`);
					}
				}
			);
		} else {
			// Sending unsubscribedCOV notifications is not yet implemented in bacstack
		}
	}

	/**
	 * Encode a property value so that it matches the requested type.
	 *
	 * This is because we store some values differently to the way they are
	 * transmitted via BACnet.  For example we store a bit string as an array of
	 * enum items, so this needs to be encoded into an integer value before
	 * it can be sent in a readProperty response.
	 *
	 * @param BACnetObjectProperty property
	 *   Property class instance to encode.  This must be an instance of
	 *   BACnetObjectProperty as we need to access the property data type.
	 *
	 * @return Object suitable for passing to node-bacstack in a BACnet message
	 *   response.
	 */
	encodePropValue(property) {
		let encodedValue = property.value;
		if (!Array.isArray(encodedValue)) encodedValue = [encodedValue];

		// These types need the whole array
		switch (property.typeId) {
			case bacnet.enum.ApplicationTags.BIT_STRING:
				return [{
					value: bacnet.createBitstring(encodedValue),
					type: property.typeId,
				}];
		}

		// These types encode per item within the array.
		return encodedValue.map(item => (
			{
				value: (() => {
					switch (property.typeId) {
						case bacnet.enum.ApplicationTags.NULL:
						case bacnet.enum.ApplicationTags.BOOLEAN:
						case bacnet.enum.ApplicationTags.UNSIGNED_INTEGER:
						case bacnet.enum.ApplicationTags.SIGNED_INTEGER:
						case bacnet.enum.ApplicationTags.REAL:
						case bacnet.enum.ApplicationTags.DOUBLE:
						case bacnet.enum.ApplicationTags.CHARACTER_STRING:
						case bacnet.enum.ApplicationTags.ENUMERATED:
							// Nothing to do
							return item;
						//TODO case bacnet.enum.ApplicationTags.OCTET_STRING:
						// BIT_STRING is handled above
						//TODO case bacnet.enum.ApplicationTags.DATE:
						//TODO case bacnet.enum.ApplicationTags.TIME:
						case bacnet.enum.ApplicationTags.OBJECTIDENTIFIER:
							// This comes from the structure used in BACnetObject.getProperty()
							// for the OBJECT_LIST dynamic property handler.
							return {
								type: item.typeId,
								instance: item.instance,
							};
						default:
							const typeName = Util.getEnumName(BE.ApplicationTags, property.typeId);
							debug.error(`No encoding for data type ${typeName}`);
							throw new Error(`Encoding for data type ${typeName} has not been implemented in bacnet-device yet.`);
					}
				})(),
				type: property.typeId,
			}
		));
	}
};

module.exports = BACnetDevice;
