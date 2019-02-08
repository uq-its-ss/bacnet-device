//
// BACnet device implementation.
// Objects attached to devices.
//

const bacnet = require('bacstack');

const BACnetObjectProperty = require('./bacnet-object-property');
const Util = require('./util');

class BACnetObject
{
	constructor(instance, typeId, name) {
		this.instance = instance;
		this.objects = {};
		this.properties = {};

		// The type is set aEvery instance of this class is a BACnet device.
		this.addProperty(bacnet.enum.PropertyIdentifier.OBJECT_TYPE).value = typeId;
		this.addProperty(bacnet.enum.PropertyIdentifier.OBJECT_NAME).value = name;
	}

	/**
	 * Add a new property if it doesn't already exist, and return it either way.
	 */
	addProperty(propertyId, typeId = undefined) {
		return (
			this.properties[propertyId]
			|| (
				this.properties[propertyId] = new BACnetObjectProperty(propertyId, typeId)
			)
		);
	}

	/// Delete an ele
	delProperty(propertyId, index = undefined) {
		if (index !== undefined) delete this.properties[propertyId][index];
		else delete this.properties[propertyId];
	}

	getProperty(propertyId) {
		// Some properties are generated dynamically
		switch (propertyId) {
			case bacnet.enum.PropertyIdentifier.OBJECT_IDENTIFIER: {
				// Construct this one from the other properties.
				const prop = new BACnetObjectProperty(propertyId, undefined, true);
				prop._value = {
					// Object type, e.g. BE.ObjectTypesSupported.DEVICE
					// Is this typeId?
					type: this.getProperty(bacnet.enum.PropertyIdentifier.OBJECT_TYPE).value,
					// Instance number.
					instance: this.instance,
				};
				return prop;
			}

			case bacnet.enum.PropertyIdentifier.PROPERTY_LIST: {
				// Return a list of all properties.

				// These properties are not included per the BACnet standard.
				const ignoreProps = [
					bacnet.enum.PropertyIdentifier.OBJECT_NAME,
					bacnet.enum.PropertyIdentifier.OBJECT_TYPE,
					bacnet.enum.PropertyIdentifier.OBJECT_IDENTIFIER,
					bacnet.enum.PropertyIdentifier.PROPERTY_LIST,
				];
				const prop = new BACnetObjectProperty(propertyId, undefined, true);
				prop._value = Object
					.keys(this.properties)
					.map(p => parseInt(p))
					.filter(p => !ignoreProps.includes(p))
				;
				return prop;
			}

			case bacnet.enum.PropertyIdentifier.OBJECT_LIST: {
				let objectList = [];
				Object.keys(this.objects).forEach(objectInstance => {
					const obj = this.objects[objectInstance];
					objectList.push({
						type: obj.getProperty(bacnet.enum.PropertyIdentifier.OBJECT_TYPE),
						instance: obj.instance,
					});
				});
				const prop = new BACnetObjectProperty(propertyId, undefined, true);
				prop._value = objectList;
				return prop;
			}

			case bacnet.enum.PropertyIdentifier.PROTOCOL_OBJECT_TYPES_SUPPORTED: {
				// Run through all our objects and return just the types in use.
				let typeList = {};
				Object.keys(this.objects).forEach(objectInstance => {
					const obj = this.objects[objectInstance];
					const type = obj.getProperty(bacnet.enum.PropertyIdentifier.OBJECT_TYPE).value;
					typeList[type] = true;
				});
				const prop = new BACnetObjectProperty(propertyId, undefined, true);
				prop._value = Object.keys(typeList).map(t => parseInt(t));
				return prop;
			}

			default:
				break;
		}
		return this.properties[propertyId];
	}

	/**
	 * Return an object with the properties as string keys, suitable for passing
	 * to console.log() to check the current state of the object.
	 *
	 * This is more useful than dumping `this.properties`, as this function will
	 * convert the enums from integers into strings.
	 */
	dumpProperties() {
		let fullPropList = Object.keys(this.properties).map(p => parseInt(p));

		// Include dynamic props in the dump
		fullPropList.push(bacnet.enum.PropertyIdentifier.PROTOCOL_OBJECT_TYPES_SUPPORTED);
		fullPropList.push(bacnet.enum.PropertyIdentifier.OBJECT_IDENTIFIER);
		fullPropList.push(bacnet.enum.PropertyIdentifier.PROPERTY_LIST);
		fullPropList.push(bacnet.enum.PropertyIdentifier.OBJECT_LIST);

		let props = {};
		fullPropList.forEach(key => {
			const property = this.getProperty(key);
			const keyName = Util.getPropName(key);
			props[keyName] = property.valueAsString();
		});
		return props;
	}


	/**
	 * Add a new object to the device, such as a sensor reading.
	 *
	 * @param Number instance
	 *   ID number for the item.  Typically these start at 1.
	 *
	 * @param bacnet.enum.ObjectType objectTypeId
	 *   Object type, such as an analogue input or digital output.
	 *
	 * @param string name
	 *   User-friendly name for the object, such as "Room temperature".
	 */
	addObject(instance, objectTypeId, name) {
		return this.objects[instance] = new BACnetObject(instance, objectTypeId, name);
	}
};

module.exports = BACnetObject;
