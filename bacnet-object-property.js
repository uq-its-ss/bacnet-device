//
// BACnet device implementation.
// Property of an object, such as the current value or maximum reading.
//

const nodeUtil = require('util');
const bacnet = require('bacstack');

const propertyTypeMap = require('./typemap-property');
const Util = require('./util');

const pi = bacnet.enum.PropertyIdentifier;

const typeEnumMap = {
	[pi.OBJECT_TYPE]: bacnet.enum.ObjectType,
};

class BACnetObjectProperty
{
	constructor(propertyId, typeId = undefined, readOnly = false) {
		this.propertyId = propertyId;
		this.typeId = typeId || propertyTypeMap[propertyId];
		this.readOnly = readOnly;

		if (this.typeId === undefined) {
			throw new Error(`Property ${Util.getPropName(propertyId)} has no default `
				+ `type set, you must specify one yourself or update the bacnet-device `
				+ `Node module.`);
		}
	}

	get value() {
		return this._value;
	}

	set value(newValue) {
		if (this.readOnly) {
			throw new Error(`Property ${Util.getPropName(this.propertyId)} cannot be changed.`);
		}
		this._value = newValue;
		// TODO: Notify any subscribeCOV listeners
		console.log('value updated, notify listeners');
	}

	valueAsString() {
		let lookup = typeEnumMap[this.propertyId];
		let value = this._value;
		if (lookup) {
			value = Util.getEnumName(lookup, value);
		}
		return value;
	}

	toString() {
		return `BACnetObjectProperty { ${Util.getPropName(this.propertyId)} = ${this.valueAsString()} }`;
	}

	[nodeUtil.inspect.custom]() {
		return this.toString();
	}
};

module.exports = BACnetObjectProperty;
